import { makeExercise, makeSession } from '../utils/testFixtures';
import { mergeWorkoutHistories } from './merge';

describe('mergeWorkoutHistories', () => {
  it('unions local-only and server-only workouts, newest first', () => {
    const localOnly = makeSession({ startedAt: 1_000 });
    const serverOnly = makeSession({ startedAt: 2_000 });

    const { merged, needsResync } = mergeWorkoutHistories([localOnly], [serverOnly]);

    expect(merged.map((w) => w.id)).toEqual([serverOnly.id, localOnly.id]);
    expect(needsResync).toEqual([]);
  });

  it('lets the server copy win when both sides have exercises', () => {
    const local = makeSession({ name: 'Local name' });
    const server = { ...local, name: 'Server name', exercises: [makeExercise()] };

    const { merged, needsResync } = mergeWorkoutHistories([local], [server]);

    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('Server name');
    expect(needsResync).toEqual([]);
  });

  it('keeps the local copy and flags it for re-sync when the server copy lost its exercises', () => {
    const local = makeSession(); // has one exercise via the fixture
    const corruptServer = { ...local, exercises: [] };

    const { merged, needsResync } = mergeWorkoutHistories([local], [corruptServer]);

    expect(merged).toHaveLength(1);
    expect(merged[0].exercises).toHaveLength(1);
    expect(needsResync).toEqual([local]);
  });

  it('still lets an empty server copy through when the local copy is empty too', () => {
    const local = makeSession({ exercises: [] });
    const server = { ...local, name: 'Server name' };

    const { merged, needsResync } = mergeWorkoutHistories([local], [server]);

    expect(merged[0].name).toBe('Server name');
    expect(needsResync).toEqual([]);
  });
});
