export function addDuration(base: Date, duration: string): Date {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];
  const result = new Date(base);

  switch (unit) {
    case 's':
      result.setSeconds(result.getSeconds() + value);
      break;
    case 'm':
      result.setMinutes(result.getMinutes() + value);
      break;
    case 'h':
      result.setHours(result.getHours() + value);
      break;
    case 'd':
      result.setDate(result.getDate() + value);
      break;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }

  return result;
}

export function durationToSeconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
}
