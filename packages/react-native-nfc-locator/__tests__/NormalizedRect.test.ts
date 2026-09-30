import { centeredSquare, normalizedRect, tryNormalizedRect, centerX, centerY } from '../src';

describe('NormalizedRect', () => {
  it('accepts a valid rect', () => {
    expect(normalizedRect(0.3, 0.2, 0.4, 0.14)).toEqual({ x: 0.3, y: 0.2, width: 0.4, height: 0.14 });
  });
  it.each([
    [-0.1, 0, 0.1, 0.1],
    [0, -0.1, 0.1, 0.1],
    [0, 0, 1.5, 0.1],
    [0, 0, 0.1, 1.5],
    [0.9, 0, 0.3, 0.1],
    [0, 0.9, 0.1, 0.3],
    [NaN, 0, 0.1, 0.1],
    [0, 0, Infinity, 0.1],
  ])('rejects (%p, %p, %p, %p)', (x, y, w, h) => {
    expect(() => normalizedRect(x, y, w, h)).toThrow(RangeError);
    expect(tryNormalizedRect(x, y, w, h)).toBeNull();
  });
  it('centeredSquare clamps into bounds and keeps the side', () => {
    const r = centeredSquare(0, 0, 0.3);
    expect(r).toEqual({ x: 0, y: 0, width: 0.3, height: 0.3 });
    const far = centeredSquare(1, 1, 0.3);
    expect(far.x + far.width).toBeCloseTo(1);
    expect(centerX(centeredSquare(0.5, 0.22, 0.3))).toBeCloseTo(0.5);
    expect(centerY(centeredSquare(0.5, 0.22, 0.3))).toBeCloseTo(0.22);
  });
});
