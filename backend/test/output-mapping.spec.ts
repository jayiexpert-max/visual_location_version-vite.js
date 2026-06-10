import type { IoOutputPlan } from '../src/modules/io/io.service';

function collectOutputPins(outputs: IoOutputPlan[], action: 'highlight' | 'off'): number[] {
  return outputs
    .filter((output) => (action === 'off' ? true : output.state === 1))
    .map((output) => output.pin);
}

describe('Output mapping', () => {
  it('maps highlight outputs to active pins only', () => {
    const outputs: IoOutputPlan[] = [
      { pin: 1, state: 1, role: 'box' },
      { pin: 2, state: 0, role: 'green' },
      { pin: 3, state: 1, role: 'yellow' },
    ];

    expect(collectOutputPins(outputs, 'highlight')).toEqual([1, 3]);
  });

  it('maps off outputs to all configured pins', () => {
    const outputs: IoOutputPlan[] = [
      { pin: 1, state: 1, role: 'box' },
      { pin: 2, state: 0, role: 'green' },
    ];

    expect(collectOutputPins(outputs, 'off')).toEqual([1, 2]);
  });
});
