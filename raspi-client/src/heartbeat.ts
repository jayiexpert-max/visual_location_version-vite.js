import mqtt, { type MqttClient } from 'mqtt';
import type { RaspiConfig } from './config.js';

export function startHeartbeat(
  client: MqttClient,
  config: RaspiConfig,
  getIp: () => string,
): NodeJS.Timeout {
  const publish = (): void => {
    const payload = {
      deviceId: config.deviceId,
      status: 'online',
      ip: getIp(),
      timestamp: new Date().toISOString(),
    };

    client.publish('factory/device/status', JSON.stringify(payload), {
      qos: 0,
    });
  };

  publish();
  return setInterval(publish, config.heartbeatIntervalSec * 1000);
}

export function createMqttClient(config: RaspiConfig): MqttClient {
  return mqtt.connect(config.brokerUrl, {
    clientId: config.clientId,
    reconnectPeriod: 5000,
    connectTimeout: 10_000,
    clean: true,
  });
}
