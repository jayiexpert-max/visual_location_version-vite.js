export class OutputController {
  private readonly activeOutputs = new Set<number>();

  constructor(private readonly outputCount: number) {}

  getOutputCount(): number {
    return this.outputCount;
  }

  getActiveOutputs(): number[] {
    return [...this.activeOutputs].sort((a, b) => a - b);
  }

  highlight(outputs: number[]): void {
    for (const pin of outputs) {
      if (this.isValidPin(pin)) {
        this.activeOutputs.add(pin);
      }
    }
  }

  off(outputs: number[]): void {
    for (const pin of outputs) {
      if (this.isValidPin(pin)) {
        this.activeOutputs.delete(pin);
      }
    }
  }

  resetAll(): void {
    this.activeOutputs.clear();
  }

  private isValidPin(pin: number): boolean {
    return Number.isInteger(pin) && pin > 0 && pin <= this.outputCount;
  }
}
