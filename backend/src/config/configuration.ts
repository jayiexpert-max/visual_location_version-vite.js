export type DeviceType = 'desktop' | 'handheld' | 'tv';

export interface AppConfig {
  port: number;
  baseUrl: string;
  timezone: string;
  nodeEnv: string;
  corsOrigins: string[];
}

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  charset: string;
  timezone: string;
  logging: boolean;
}

export interface JwtConfig {
  accessSecret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
  desktopAccessExpiresIn: string;
  handheldAccessExpiresIn: string;
  shiftLogoutEnabled: boolean;
  shiftCutoffMorning: string;
  shiftCutoffEvening: string;
}

export interface CpkConfig {
  baseUrl: string;
  legacyUrl: string;
  useLegacyUrl: boolean;
  mcId: string;
  stationKey: string;
  curlTimeout: number;
  curlConnectTimeout: number;
}

export interface PdserviceConfig {
  baseUrl: string;
}

export interface MqttConfig {
  brokerUrl: string;
  clientId: string;
  topicPrefix: string;
  username: string;
  password: string;
  highlightDurationSec: number;
}

export interface IoConfig {
  raspiIoKey: string;
  towerOnly: boolean;
}

export interface TvConfig {
  kioskKey: string;
  allowedIps: string[];
  layout3dAllowedIps: string[];
}

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
}

export interface SecurityConfig {
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
}

export interface RootConfig {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  cpk: CpkConfig;
  pdservice: PdserviceConfig;
  mqtt: MqttConfig;
  io: IoConfig;
  tv: TvConfig;
  redis: RedisConfig;
  security: SecurityConfig;
}

function parseIntEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCsv(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') {
    return fallback;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

export default (): RootConfig => ({
  app: {
    port: parseIntEnv(process.env.APP_PORT, 3000),
    baseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
    timezone: process.env.TIMEZONE ?? 'Asia/Bangkok',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    corsOrigins: parseCsv(process.env.CORS_ORIGINS),
  },
  database: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: parseIntEnv(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME ?? 'visual_inventory_db',
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASS ?? '',
    charset: process.env.DB_CHARSET ?? 'utf8mb4',
    timezone: process.env.DB_TIMEZONE ?? '+07:00',
    logging: parseBool(process.env.DB_LOGGING, false),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '4h',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    desktopAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '4h',
    handheldAccessExpiresIn:
      process.env.JWT_HANDHELD_ACCESS_EXPIRES_IN ?? '30m',
    shiftLogoutEnabled: parseBool(process.env.SHIFT_LOGOUT_ENABLED, true),
    shiftCutoffMorning: process.env.SHIFT_CUTOFF_MORNING ?? '07:00',
    shiftCutoffEvening: process.env.SHIFT_CUTOFF_EVENING ?? '19:00',
  },
  cpk: {
    baseUrl:
      process.env.CPK_SERVICE_BASE_URL ??
      'http://194.10.10.15/CPKservice/cpk_service',
    legacyUrl:
      process.env.CPK_SERVICE_LEGACY_URL ??
      'http://194.10.10.15/CPKService/CPKService.svc/rest',
    useLegacyUrl: parseBool(process.env.CPK_USE_LEGACY_URL, false),
    mcId: process.env.CPK_MC_ID ?? '',
    stationKey: process.env.CPK_STATION_KEY ?? '',
    curlTimeout: parseIntEnv(process.env.CPK_CURL_TIMEOUT, 10),
    curlConnectTimeout: parseIntEnv(process.env.CPK_CURL_CONNECT_TIMEOUT, 5),
  },
  pdservice: {
    baseUrl:
      process.env.PDSERVICE_BASE_URL ??
      'http://194.10.10.15/cpkservice/cpkservice.svc/rest',
  },
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL ?? 'mqtt://127.0.0.1:1883',
    clientId: process.env.MQTT_CLIENT_ID ?? 'visual-location-api',
    topicPrefix: process.env.MQTT_IO_TOPIC_PREFIX ?? 'visual/io',
    username: process.env.MQTT_USERNAME ?? '',
    password: process.env.MQTT_PASSWORD ?? '',
    highlightDurationSec: parseIntEnv(
      process.env.IO_HIGHLIGHT_DURATION_SEC,
      60,
    ),
  },
  io: {
    raspiIoKey: process.env.RASPI_IO_KEY ?? '',
    towerOnly: parseBool(process.env.IO_TOWER_ONLY, false),
  },
  tv: {
    kioskKey: process.env.TV_KIOSK_KEY ?? '',
    allowedIps: parseCsv(process.env.TV_ALLOWED_IPS),
    layout3dAllowedIps: parseCsv(process.env.LAYOUT_3D_ALLOWED_IPS),
  },
  redis: {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: parseIntEnv(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD ?? '',
  },
  security: {
    maxFailedLoginAttempts: parseIntEnv(
      process.env.SECURITY_MAX_FAILED_LOGIN_ATTEMPTS,
      5,
    ),
    lockoutDurationMinutes: parseIntEnv(
      process.env.SECURITY_LOCKOUT_DURATION_MINUTES,
      15,
    ),
  },
});
