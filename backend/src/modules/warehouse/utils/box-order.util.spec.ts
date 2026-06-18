import { compareBoxesInLevel, sortBoxesInLevel } from './box-order.util';

describe('box-order.util', () => {
  it('sorts by numeric box_code when position_in_level is null (Rack 5 L2)', () => {
    const boxes = [
      { id: 10, boxCode: '2', positionInLevel: null },
      { id: 12, boxCode: '1', positionInLevel: null },
    ];
    expect(sortBoxesInLevel(boxes).map((b) => b.boxCode)).toEqual(['1', '2']);
  });

  it('prefers position_in_level when set', () => {
    const boxes = [
      { id: 10, boxCode: '2', positionInLevel: 2 },
      { id: 12, boxCode: '1', positionInLevel: 1 },
    ];
    expect(sortBoxesInLevel(boxes).map((b) => b.boxCode)).toEqual(['1', '2']);
  });

  it('compareBoxesInLevel is stable for equal keys', () => {
    expect(compareBoxesInLevel({ id: 1, boxCode: '1' }, { id: 2, boxCode: '1' })).toBeLessThan(0);
  });
});
