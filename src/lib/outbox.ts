// Offline-durable write queue. Every server write goes through here: the job is
// persisted to AsyncStorage first, then drained. If a write fails (offline, a
// network blip), the job stays queued and is retried on the next trigger —
// reconnect, app start, or the next enqueue — so a finished workout is never
// silently lost the way a bare fire-and-forget would lose it.

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  BodyWeightEntry,
  Exercise,
  Settings,
  WorkoutSession,
  WorkoutTemplate,
} from '../types';
import { uid } from '../utils/id';
import {
  deleteCustomExercise,
  deleteTemplate,
  saveBodyWeight,
  saveCustomExercise,
  saveSettings,
  saveTemplate,
  saveWorkout,
} from './sync';

type JobBody =
  | { kind: 'workout'; payload: WorkoutSession }
  | { kind: 'template'; payload: WorkoutTemplate }
  | { kind: 'settings'; payload: Settings }
  | { kind: 'customExercise'; payload: Exercise }
  | { kind: 'bodyWeight'; payload: BodyWeightEntry }
  | { kind: 'templateDelete'; payload: { id: string } }
  | { kind: 'exerciseDelete'; payload: { id: string } };

type Job = JobBody & { id: string; userId: string; attempts?: number };

const KEY = 'progressive-outbox-v1';
const MAX_ATTEMPTS = 6; // drop a poison job after this many failures so it can't wedge the queue

let queue: Job[] = [];
let loaded = false;
let draining = false;

async function load(): Promise<void> {
  if (loaded) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    queue = raw ? (JSON.parse(raw) as Job[]) : [];
  } catch {
    queue = [];
  }
  loaded = true;
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    // Non-fatal: the in-memory queue still drains this session.
  }
}

function run(job: Job): Promise<void> {
  switch (job.kind) {
    case 'workout':
      return saveWorkout(job.userId, job.payload);
    case 'template':
      return saveTemplate(job.userId, job.payload);
    case 'settings':
      return saveSettings(job.userId, job.payload);
    case 'customExercise':
      return saveCustomExercise(job.userId, job.payload);
    case 'bodyWeight':
      return saveBodyWeight(job.userId, job.payload);
    case 'templateDelete':
      return deleteTemplate(job.payload.id);
    case 'exerciseDelete':
      return deleteCustomExercise(job.payload.id);
  }
}

/** Queue a write and kick off a drain. Never rejects — persistence is best-effort. */
export function enqueue(userId: string, body: JobBody): void {
  void (async () => {
    await load();
    queue.push({ ...body, id: uid('job'), userId });
    await persist();
    void drain();
  })();
}

/** Attempt every queued job in order. Transient failures stop the run (retried
 *  later); a job that keeps failing is dropped after MAX_ATTEMPTS. */
export async function drain(): Promise<void> {
  await load();
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      const job = queue[0];
      try {
        await run(job);
        queue.shift();
        await persist();
      } catch (err) {
        job.attempts = (job.attempts ?? 0) + 1;
        const msg = (err as { message?: string })?.message ?? err;
        if (job.attempts >= MAX_ATTEMPTS) {
          console.warn(`[outbox] dropping ${job.kind} after ${job.attempts} attempts:`, msg);
          queue.shift();
          await persist();
          continue; // move on to the next job
        }
        console.warn(`[outbox] ${job.kind} failed (attempt ${job.attempts}), will retry:`, msg);
        await persist();
        break; // stop; retry the rest on the next trigger
      }
    }
  } finally {
    draining = false;
  }
}

// Retry automatically when connectivity returns (web) and once on startup.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('online', () => void drain());
}
void drain();
