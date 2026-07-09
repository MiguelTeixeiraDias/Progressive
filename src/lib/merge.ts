// Merging local (AsyncStorage) history with the server's copy on sign-in/load.
// Kept pure and dependency-free so it can be unit-tested without the store.

import { WorkoutSession } from '../types';

export interface WorkoutMerge {
  /** Union of both histories, newest first. */
  merged: WorkoutSession[];
  /** Local copies that beat a corrupt server copy and must be re-uploaded. */
  needsResync: WorkoutSession[];
}

/**
 * Union local and server workout history by id. The server copy wins on
 * conflict — except when it is a completed workout with no exercises while the
 * local copy has some. The app never saves an empty completed workout (the
 * finish flow requires at least one completed set), so that shape can only
 * mean a partial sync (e.g. the parent row landed but the child inserts
 * failed). Keeping the local copy and flagging it for re-upload both preserves
 * the training data and heals the server on the next outbox drain.
 */
export function mergeWorkoutHistories(
  local: WorkoutSession[],
  server: WorkoutSession[],
): WorkoutMerge {
  const byId = new Map<string, WorkoutSession>();
  for (const w of local) byId.set(w.id, w);

  const needsResync: WorkoutSession[] = [];
  for (const w of server) {
    const localCopy = byId.get(w.id);
    if (localCopy && w.exercises.length === 0 && localCopy.exercises.length > 0) {
      needsResync.push(localCopy);
      continue; // keep the richer local copy
    }
    byId.set(w.id, w);
  }

  return {
    merged: [...byId.values()].sort((a, b) => b.startedAt - a.startedAt),
    needsResync,
  };
}
