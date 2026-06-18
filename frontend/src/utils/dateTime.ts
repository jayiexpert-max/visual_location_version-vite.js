const FACTORY_TIME_ZONE = 'Asia/Bangkok';
const FACTORY_OFFSET = '+07:00';

type DateInput = Date | string | number | null | undefined;

function hasExplicitTimezone(value: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
}

export function parseFactoryDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = value.trim();
  if (!raw) return null;

  let normalized = raw.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    normalized = `${normalized}T00:00:00${FACTORY_OFFSET}`;
  } else if (!hasExplicitTimezone(normalized)) {
    normalized = `${normalized}${FACTORY_OFFSET}`;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function factoryParts(value: DateInput): Record<string, string> | null {
  const date = parseFactoryDate(value);
  if (!date) return null;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: FACTORY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function formatFactoryDate(value: DateInput): string | null {
  const parts = factoryParts(value);
  if (!parts) return null;
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatFactoryIsoDate(value: DateInput): string | null {
  const parts = factoryParts(value);
  if (!parts) return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatFactoryTime(value: DateInput): string | null {
  const parts = factoryParts(value);
  if (!parts) return null;
  return `${parts.hour}:${parts.minute}`;
}

export function formatFactoryDateTime(value: DateInput): string | null {
  const date = formatFactoryDate(value);
  const time = formatFactoryTime(value);
  if (!date || !time) return null;
  return `${date} ${time}`;
}
