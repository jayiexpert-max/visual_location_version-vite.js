export interface CpkVersionInfo {
  version: string | null;
  releaseDate: string | null;
}

const VERSION_KEYS = ['Version', 'version', 'ServiceVersion'] as const;
const DATE_KEYS = ['Date', 'ReleaseDate', 'BuildDate', 'VersionDate'] as const;
const VERSION_PATTERN = /\d+\.\d+\.\d+(?:\.\d+)?/;

function readRecord(record: Record<string, unknown>): CpkVersionInfo {
  let version: string | null = null;
  let releaseDate: string | null = null;

  for (const key of VERSION_KEYS) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      version = value.trim();
      break;
    }
  }

  for (const key of DATE_KEYS) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      releaseDate = value.trim();
      break;
    }
  }

  return { version, releaseDate };
}

function parseStringPayload(raw: string): CpkVersionInfo {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { version: null, releaseDate: null };
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const inner = JSON.parse(trimmed);
      if (typeof inner === 'string') {
        return parseStringPayload(inner);
      }
    } catch {
      /* use raw text below */
    }
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return parseCpkVersionPayload(JSON.parse(trimmed));
    } catch {
      /* use raw text below */
    }
  }

  const versionMatch = trimmed.match(VERSION_PATTERN);
  return {
    version: versionMatch?.[0] ?? (VERSION_PATTERN.test(trimmed) ? trimmed : null),
    releaseDate: null,
  };
}

/** Parse GetVersion payload from /health/cpk (string, JSON object, or encoded string). */
export function parseCpkVersionPayload(payload: unknown): CpkVersionInfo {
  if (payload == null) {
    return { version: null, releaseDate: null };
  }

  if (typeof payload === 'string') {
    return parseStringPayload(payload);
  }

  if (typeof payload === 'object' && !Array.isArray(payload)) {
    return readRecord(payload as Record<string, unknown>);
  }

  return { version: null, releaseDate: null };
}

export function formatCpkReleaseDate(raw: string, locale: string): string {
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return raw;
}
