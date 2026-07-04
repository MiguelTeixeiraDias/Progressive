import { bmi, bmiLabel, repGuidance, suggestedIncrement, weightToTarget } from './coaching';

describe('repGuidance', () => {
  test('maps goals to rep ranges', () => {
    expect(repGuidance('Get stronger')).toMatchObject({ low: 3, high: 6 });
    expect(repGuidance('Build muscle')).toMatchObject({ low: 8, high: 12 });
  });

  test('returns null for an unset goal', () => {
    expect(repGuidance(undefined)).toBeNull();
  });
});

describe('suggestedIncrement', () => {
  test('scales with experience and load', () => {
    expect(suggestedIncrement('Beginner', 100)).toBe(5);
    expect(suggestedIncrement('Beginner', 40)).toBe(2.5);
    expect(suggestedIncrement('Advanced', 100)).toBe(2.5);
    expect(suggestedIncrement('Advanced', 40)).toBe(1.25);
  });

  test('falls back to the default thresholds when level is unknown', () => {
    expect(suggestedIncrement(undefined, 100)).toBe(5);
    expect(suggestedIncrement(undefined, 40)).toBe(2.5);
  });
});

describe('bmi', () => {
  test('computes body mass index from kg + cm', () => {
    expect(bmi(80, 180)).toBeCloseTo(24.69, 2);
  });

  test('returns null on missing or invalid inputs', () => {
    expect(bmi(undefined, 180)).toBeNull();
    expect(bmi(80, undefined)).toBeNull();
    expect(bmi(80, 0)).toBeNull();
  });

  test('labels track the standard bands', () => {
    expect(bmiLabel(17)).toBe('Underweight');
    expect(bmiLabel(22)).toBe('Healthy');
    expect(bmiLabel(27)).toBe('Overweight');
    expect(bmiLabel(32)).toBe('Obese');
  });
});

describe('weightToTarget', () => {
  test('reports the direction and distance to a target', () => {
    expect(weightToTarget(90, 80)).toEqual({ delta: 10, direction: 'lose' });
    expect(weightToTarget(70, 80)).toEqual({ delta: 10, direction: 'gain' });
  });

  test('treats near-equal weights as reached', () => {
    expect(weightToTarget(80, 80)).toEqual({ delta: 0, direction: 'reached' });
  });

  test('returns null without both values', () => {
    expect(weightToTarget(undefined, 80)).toBeNull();
    expect(weightToTarget(80, undefined)).toBeNull();
  });
});
