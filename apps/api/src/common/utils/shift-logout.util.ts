export interface ShiftLogoutConfig {
  enabled: boolean;
  morningCutoff: string;
  eveningCutoff: string;
}

interface BangkokWallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map((part) => Number.parseInt(part, 10));
  return hours * 60 + minutes;
}

function getBangkokWallClock(now: Date): BangkokWallClock {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value;
    return Number.parseInt(value ?? '0', 10);
  };

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

function bangkokLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return new Date(
    `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+07:00`,
  );
}

function subtractBangkokDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } {
  const utc = bangkokLocalToUtc(year, month, day, 12, 0);
  utc.setUTCDate(utc.getUTCDate() - days);
  const shifted = getBangkokWallClock(utc);
  return {
    year: shifted.year,
    month: shifted.month,
    day: shifted.day,
  };
}

export function getLastShiftCutoff(
  now: Date,
  morningCutoff: string,
  eveningCutoff: string,
): Date {
  const wall = getBangkokWallClock(now);
  const currentMinutes = wall.hour * 60 + wall.minute;
  const morningMinutes = parseTimeToMinutes(morningCutoff);
  const eveningMinutes = parseTimeToMinutes(eveningCutoff);

  if (currentMinutes >= eveningMinutes) {
    return bangkokLocalToUtc(wall.year, wall.month, wall.day, ...splitCutoff(eveningCutoff));
  }

  if (currentMinutes >= morningMinutes) {
    return bangkokLocalToUtc(wall.year, wall.month, wall.day, ...splitCutoff(morningCutoff));
  }

  const previousDay = subtractBangkokDays(wall.year, wall.month, wall.day, 1);
  return bangkokLocalToUtc(
    previousDay.year,
    previousDay.month,
    previousDay.day,
    ...splitCutoff(eveningCutoff),
  );
}

function splitCutoff(time: string): [number, number] {
  const [hour, minute] = time.split(':').map((part) => Number.parseInt(part, 10));
  return [hour, minute];
}

export function isIssuedBeforeLastShiftCutoff(
  issuedAt: Date,
  config: ShiftLogoutConfig,
  now: Date = new Date(),
): boolean {
  if (!config.enabled) {
    return false;
  }

  const cutoff = getLastShiftCutoff(
    now,
    config.morningCutoff,
    config.eveningCutoff,
  );

  return issuedAt.getTime() < cutoff.getTime();
}
