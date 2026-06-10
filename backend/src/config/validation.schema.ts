import configuration, { RootConfig } from './configuration';

const MIN_SECRET_LENGTH = 32;

function assertNonEmpty(
  errors: string[],
  value: string,
  name: string,
): void {
  if (!value.trim()) {
    errors.push(`${name} is required`);
  }
}

function assertMinLength(
  errors: string[],
  value: string,
  name: string,
  minLength: number,
): void {
  if (value.trim().length > 0 && value.trim().length < minLength) {
    errors.push(`${name} must be at least ${minLength} characters`);
  }
}

function assertPositiveInt(
  errors: string[],
  value: number,
  name: string,
): void {
  if (!Number.isInteger(value) || value <= 0) {
    errors.push(`${name} must be a positive integer`);
  }
}

function assertUrl(errors: string[], value: string, name: string): void {
  if (!value.trim()) {
    return;
  }
  try {
    new URL(value);
  } catch {
    errors.push(`${name} must be a valid URL`);
  }
}

function validateConfigShape(config: RootConfig): string[] {
  const errors: string[] = [];

  assertPositiveInt(errors, config.app.port, 'APP_PORT');
  assertNonEmpty(errors, config.database.host, 'DB_HOST');
  assertPositiveInt(errors, config.database.port, 'DB_PORT');
  assertNonEmpty(errors, config.database.name, 'DB_NAME');
  assertNonEmpty(errors, config.database.user, 'DB_USER');

  assertNonEmpty(errors, config.jwt.accessSecret, 'JWT_ACCESS_SECRET');
  assertMinLength(
    errors,
    config.jwt.accessSecret,
    'JWT_ACCESS_SECRET',
    MIN_SECRET_LENGTH,
  );
  assertNonEmpty(errors, config.jwt.refreshSecret, 'JWT_REFRESH_SECRET');
  assertMinLength(
    errors,
    config.jwt.refreshSecret,
    'JWT_REFRESH_SECRET',
    MIN_SECRET_LENGTH,
  );

  assertUrl(errors, config.pdservice.baseUrl, 'PDSERVICE_BASE_URL');
  assertUrl(errors, config.cpk.baseUrl, 'CPK_SERVICE_BASE_URL');
  assertUrl(errors, config.cpk.legacyUrl, 'CPK_SERVICE_LEGACY_URL');
  assertPositiveInt(errors, config.cpk.curlTimeout, 'CPK_CURL_TIMEOUT');
  assertPositiveInt(
    errors,
    config.cpk.curlConnectTimeout,
    'CPK_CURL_CONNECT_TIMEOUT',
  );

  assertUrl(errors, config.mqtt.brokerUrl, 'MQTT_BROKER_URL');
  assertNonEmpty(errors, config.mqtt.clientId, 'MQTT_CLIENT_ID');
  assertPositiveInt(
    errors,
    config.mqtt.highlightDurationSec,
    'IO_HIGHLIGHT_DURATION_SEC',
  );

  if (config.app.corsOrigins.length === 0) {
    errors.push('CORS_ORIGINS must contain at least one origin');
  }

  for (const origin of config.app.corsOrigins) {
    try {
      new URL(origin);
    } catch {
      errors.push(`CORS_ORIGINS contains invalid URL: ${origin}`);
    }
  }

  return errors;
}

export function validateConfig(_config: Record<string, unknown>): RootConfig {
  const resolved = configuration();
  const errors = validateConfigShape(resolved);

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n- ${errors.join('\n- ')}`,
    );
  }

  return resolved;
}
