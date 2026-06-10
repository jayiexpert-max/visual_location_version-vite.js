import type { RaspiConfig } from './config.js';
import { OutputController } from './output-controller.js';

type HighlightCommand = {
  command: 'highlight';
  deviceId: number;
  boxId?: number;
  slotId?: number | null;
  outputs: number[];
};

type OffCommand = {
  command: 'off';
  deviceId: number;
  outputs: number[];
};

type ResetCommand = {
  command: 'reset';
};

type IoCommand = HighlightCommand | OffCommand | ResetCommand;

export class CommandHandler {
  constructor(
    private readonly config: RaspiConfig,
    private readonly outputs: OutputController,
    private readonly log: (message: string) => void,
  ) {}

  handle(topic: string, rawPayload: string): void {
    let payload: IoCommand;

    try {
      payload = JSON.parse(rawPayload) as IoCommand;
    } catch {
      this.log(`Invalid JSON on ${topic}`);
      return;
    }

    if (payload.command === 'reset') {
      this.outputs.resetAll();
      this.applyOutputs('reset', []);
      return;
    }

    if (payload.deviceId !== this.config.deviceId) {
      return;
    }

    if (payload.command === 'highlight') {
      this.outputs.highlight(payload.outputs);
      this.applyOutputs('highlight', payload.outputs);
      return;
    }

    if (payload.command === 'off') {
      this.outputs.off(payload.outputs);
      this.applyOutputs('off', payload.outputs);
    }
  }

  private applyOutputs(action: string, pins: number[]): void {
    if (this.config.simulatorMode) {
      this.log(
        `[SIMULATOR] ${action} device=${this.config.deviceId} pins=[${pins.join(',')}] active=[${this.outputs.getActiveOutputs().join(',')}]`,
      );
      return;
    }

    // Production: integrate Modbus TCP / Ethernet relay driver here.
    this.log(
      `[IO] ${action} device=${this.config.deviceId} pins=[${pins.join(',')}]`,
    );
  }
}
