export interface RaspiConfig {
  deviceId: number;
  brokerUrl: string;
  clientId: string;
  topicPrefix: string;
  outputCount: number;
  heartbeatIntervalSec: number;
  simulatorMode: boolean;
  hostname: string;
}

function parseIntEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(): RaspiConfig {
  const deviceId = parseIntEnv(process.env.DEVICE_ID, 1);
  const outputCount = parseIntEnv(process.env.OUTPUT_COUNT, 16);

  const allowedOutputs = [16, 32, 64, 128, 256];
  const normalizedOutputs = allowedOutputs.includes(outputCount)
    ? outputCount
    : 16;

  return {
    deviceId,
    brokerUrl: process.env.MQTT_BROKER_URL ?? 'mqtt://127.0.0.1:1883',
    clientId: process.env.MQTT_CLIENT_ID ?? `visual-raspi-${deviceId}`,
    topicPrefix: process.env.MQTT_IO_TOPIC_PREFIX ?? 'visual/io',
    outputCount: normalizedOutputs,
    heartbeatIntervalSec: parseIntEnv(process.env.HEARTBEAT_INTERVAL_SEC, 30),
    simulatorMode:
      process.env.SIMULATOR_MODE === 'true' ||
      process.env.SIMULATOR_MODE === '1',
    hostname: process.env.HOSTNAME ?? `raspi-${deviceId}`,
  };
}
