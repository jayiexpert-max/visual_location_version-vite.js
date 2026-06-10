import { OutputController } from '../src/output-controller.js';

describe('OutputController', () => {
  it('supports 16/32/64/128/256 output ranges', () => {
    for (const count of [16, 32, 64, 128, 256]) {
      const controller = new OutputController(count);
      controller.highlight([1, count]);
      expect(controller.getActiveOutputs()).toEqual([1, count]);
      controller.resetAll();
      expect(controller.getActiveOutputs()).toEqual([]);
    }
  });

  it('ignores invalid pins', () => {
    const controller = new OutputController(16);
    controller.highlight([0, 17, 5]);
    expect(controller.getActiveOutputs()).toEqual([5]);
  });
});
