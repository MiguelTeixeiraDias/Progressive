import { DAY_MS } from './date';
import { makeExercise, makeSession, makeSet } from './testFixtures';
import {
  computePRs,
  currentStreak,
  epley1RM,
  nextTarget,
  overloadScore,
  personalRecordList,
  setVolume,
} from './stats';

describe('setVolume', () => {
  test('reps × weight for a plain set', () => {
    expect(setVolume(makeSet({ reps: 5, weight: 100 }))).toBe(500);
  });

  test('includes drop-set stages', () => {
    const s = makeSet({
      reps: 5,
      weight: 100,
      drops: [{ id: 'd1', reps: 5, weight: 80 }, { id: 'd2', reps: 4, weight: 60 }],
    });
    // 500 + 400 + 240
    expect(setVolume(s)).toBe(1140);
  });
});

describe('epley1RM', () => {
  test('a single rep equals the weight', () => {
    expect(epley1RM(100, 1)).toBe(100);
  });

  test('multi-rep estimate uses the Epley formula', () => {
    expect(epley1RM(100, 10)).toBeCloseTo(133.33, 2);
  });

  test('guards against non-positive inputs', () => {
    expect(epley1RM(0, 5)).toBe(0);
    expect(epley1RM(100, 0)).toBe(0);
  });
});

describe('computePRs', () => {
  test('tracks the heaviest completed set per exercise', () => {
    const sessions = [
      makeSession({
        startedAt: Date.now() - 2 * DAY_MS,
        exercises: [makeExercise({ exerciseId: 'ex_a', sets: [makeSet({ weight: 80, reps: 5 })] })],
      }),
      makeSession({
        startedAt: Date.now() - DAY_MS,
        exercises: [makeExercise({ exerciseId: 'ex_a', sets: [makeSet({ weight: 100, reps: 3 })] })],
      }),
    ];
    const prs = computePRs(sessions);
    expect(prs['ex_a'].maxWeight).toBe(100);
    expect(prs['ex_a'].repsAtMaxWeight).toBe(3);
  });

  test('ignores incomplete sets', () => {
    const sessions = [
      makeSession({
        exercises: [
          makeExercise({
            exerciseId: 'ex_a',
            sets: [makeSet({ weight: 200, reps: 1, completed: false }), makeSet({ weight: 90, reps: 5 })],
          }),
        ],
      }),
    ];
    expect(computePRs(sessions)['ex_a'].maxWeight).toBe(90);
  });

  test('personalRecordList excludes lifts with no weight and sorts by e1RM', () => {
    const sessions = [
      makeSession({
        exercises: [
          makeExercise({ exerciseId: 'ex_a', name: 'A', sets: [makeSet({ weight: 100, reps: 5 })] }),
          makeExercise({ exerciseId: 'ex_b', name: 'B', sets: [makeSet({ weight: 60, reps: 5 })] }),
        ],
      }),
    ];
    const list = personalRecordList(sessions);
    expect(list.map((p) => p.exerciseId)).toEqual(['ex_a', 'ex_b']);
  });
});

describe('currentStreak', () => {
  test('counts consecutive days ending today', () => {
    const sessions = [
      makeSession({ startedAt: Date.now() }),
      makeSession({ startedAt: Date.now() - DAY_MS }),
      makeSession({ startedAt: Date.now() - 2 * DAY_MS }),
    ];
    expect(currentStreak(sessions)).toBe(3);
  });

  test('a gap breaks the streak', () => {
    const sessions = [
      makeSession({ startedAt: Date.now() }),
      makeSession({ startedAt: Date.now() - 3 * DAY_MS }),
    ];
    expect(currentStreak(sessions)).toBe(1);
  });

  test('no sessions means no streak', () => {
    expect(currentStreak([])).toBe(0);
  });
});

describe('nextTarget', () => {
  test('suggests a lift trained twice with non-declining volume', () => {
    const sessions = [
      makeSession({
        startedAt: Date.now() - 5 * DAY_MS,
        exercises: [makeExercise({ exerciseId: 'ex_a', name: 'Squat', sets: [makeSet({ weight: 100, reps: 5 })] })],
      }),
      makeSession({
        startedAt: Date.now() - DAY_MS,
        exercises: [makeExercise({ exerciseId: 'ex_a', name: 'Squat', sets: [makeSet({ weight: 100, reps: 6 })] })],
      }),
    ];
    const target = nextTarget(sessions);
    expect(target?.exerciseId).toBe('ex_a');
    expect(target?.increment).toBe(5); // top weight >= 60 -> +5
  });

  test('returns null without a second data point', () => {
    expect(nextTarget([makeSession()])).toBeNull();
  });
});

describe('overloadScore', () => {
  test('is 40 with no data and stays within 0-100', () => {
    const score = overloadScore([]);
    expect(score).toBe(40);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
