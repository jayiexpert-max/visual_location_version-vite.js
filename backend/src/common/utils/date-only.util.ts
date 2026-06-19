const FACTORY_TIME_ZONE = 'Asia/Bangkok';

function partsInFactoryTz(date: Date): { year: string; month: string; day: string } | null {
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: FACTORY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const map = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  );

  if (!map.year || !map.month || !map.day) return null;
  return { year: map.year, month: map.month, day: map.day };
}

/** Normalize DB/API dates to `YYYY-MM-DD` (factory timezone). */
export function toDateOnlyString(
  value: Date | string | null | undefined,
): string | null {
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date) {
    const parts = partsInFactoryTz(value);
    return parts ? `${parts.year}-${parts.month}-${parts.day}` : null;
  }

  const raw = String(value).trim();
  if (!raw || raw === '0000-00-00') return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return toDateOnlyString(parsed);
  }

  return null;
}
