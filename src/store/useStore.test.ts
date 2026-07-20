/**
 * Regression tests for keeping an in-progress workout alive across a reload /
 * PWA reopen. The store rehydrates `activeWorkout` from storage but NOT `userId`
 * (it isn't persisted), so on a cold boot `loadFromServer` runs with a null local
 * userId — it must not treat that as an account switch and drop the workout.
 *
 * The network (lib/sync) and write queue (lib/outbox) are mocked so these stay
 * pure store-logic tests under the node test environment.
 */
import type { UserData } from '../lib/sync';
import type { WorkoutSession } from '../types';

// In-memory AsyncStorage so the persist middleware has somewhere to read/write.
jest.mock('@react-native-async-storage/async-storage', () => {
  const mem: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: (k: string) => Promise.resolve(mem[k] ?? null),
      setItem: (k: string, v: string) => {
        mem[k] = v;
        return Promise.resolve();
      },
      removeItem: (k: string) => {
        delete mem[k];
        return Promise.resolve();
      },
    },
  };
});

// `mock`-prefixed so jest allows referencing it inside the hoisted factory.
const mockLoadUserData = jest.fn<Promise<UserData>, [string]>();
jest.mock('../lib/sync', () => ({
  loadUserData: (userId: string) => mockLoadUserData(userId),
}));
jest.mock('../lib/outbox', () => ({
  drain: jest.fn(() => Promise.resolve()),
  enqueue: jest.fn(),
}));

import { useStore } from './useStore';

const emptyServer = (): UserData => ({
  settings: null,
  customExercises: [],
  templates: [],
  workouts: [],
  bodyWeights: [],
});

function makeActiveWorkout(): WorkoutSession {
  return {
    id: 'w_active',
    name: 'Leg Day',
    date: new Date().toISOString(),
    startedAt: Date.now(),
    endedAt: null,
    durationSec: 0,
    exercises: [],
    totalVolume: 0,
    completed: false,
  };
}

beforeEach(() => {
  mockLoadUserData.mockReset();
  useStore.getState().resetLocal();
});

describe('loadFromServer — active workout durability', () => {
  it('keeps the in-progress workout on a cold boot (rehydrated userId is null)', async () => {
    // Post-rehydration state: workout restored from storage, userId not persisted.
    useStore.setState({ userId: null, activeWorkout: makeActiveWorkout() });
    mockLoadUserData.mockResolvedValue(emptyServer());

    await useStore.getState().loadFromServer('user-A');

    expect(useStore.getState().activeWorkout?.id).toBe('w_active');
    expect(useStore.getState().userId).toBe('user-A');
  });

  it('keeps the in-progress workout when the same account reloads', async () => {
    useStore.setState({ userId: 'user-A', activeWorkout: makeActiveWorkout() });
    mockLoadUserData.mockResolvedValue(emptyServer());

    await useStore.getState().loadFromServer('user-A');

    expect(useStore.getState().activeWorkout?.id).toBe('w_active');
  });

  it('drops the in-progress workout when a different account signs in', async () => {
    // A live switch A -> B must not carry A's active session into B's data.
    useStore.setState({ userId: 'user-A', activeWorkout: makeActiveWorkout() });
    mockLoadUserData.mockResolvedValue(emptyServer());

    await useStore.getState().loadFromServer('user-B');

    expect(useStore.getState().activeWorkout).toBeNull();
  });
});
