import { formatVolume, formatWeight, kgToUnit, unitToKg, weightStep } from './format';

describe('unit conversion', () => {
  test('kg is the identity unit', () => {
    expect(kgToUnit(100, 'kg')).toBe(100);
    expect(unitToKg(100, 'kg')).toBe(100);
  });

  test('kg <-> lb round-trips', () => {
    const lb = kgToUnit(100, 'lb');
    expect(lb).toBeCloseTo(220.462, 2);
    expect(unitToKg(lb, 'lb')).toBeCloseTo(100, 6);
  });

  test('weight step is unit-appropriate', () => {
    expect(weightStep('kg')).toBe(2.5);
    expect(weightStep('lb')).toBe(5);
  });
});

describe('formatWeight', () => {
  test('drops trailing .0 but keeps real decimals', () => {
    expect(formatWeight(60)).toBe('60');
    expect(formatWeight(62.5)).toBe('62.5');
  });

  test('converts to the requested unit, rounded to 0.1', () => {
    expect(formatWeight(100, 'lb')).toBe('220.5');
    expect(formatWeight(100, 'kg')).toBe('100');
  });
});

describe('formatVolume', () => {
  test('compacts large numbers', () => {
    expect(formatVolume(500)).toBe('500');
    expect(formatVolume(12_540)).toBe('12.5k');
    expect(formatVolume(120_000)).toBe('120k');
  });

  test('converts kg volume to the display unit', () => {
    // 10,000 kg ≈ 22,046 lb -> "22.0k"
    expect(formatVolume(10_000, 'lb')).toBe('22.0k');
  });
});
