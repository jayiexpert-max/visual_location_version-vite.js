/** MQTT topic builders — IO commands + factory status channels */

export const MqttTopics = {
  highlight: (deviceId: number) => `visual/io/${deviceId}/highlight`,
  off: (deviceId: number) => `visual/io/${deviceId}/off`,
  reset: 'visual/io/reset',
  factoryLocationLight: 'factory/location/light',
  factoryLocationStatus: 'factory/location/status',
  factoryDeviceStatus: 'factory/device/status',
  factoryRackStatus: 'factory/rack/status',
} as const;

export const MqttSubscribePatterns = [
  'factory/device/status',
  'factory/location/status',
  'factory/rack/status',
  'factory/location/light',
  'visual/io/+/highlight',
  'visual/io/+/off',
  'visual/io/reset',
] as const;

export type MqttHighlightPayload = {
  command: 'highlight';
  deviceId: number;
  boxId: number;
  slotId?: number | null;
  outputs: number[];
};

export type MqttOffPayload = {
  command: 'off';
  deviceId: number;
  outputs: number[];
};

export type MqttResetPayload = {
  command: 'reset';
};

export type MqttDeviceStatusPayload = {
  deviceId: number;
  status: 'online' | 'offline';
  ip: string;
  timestamp: string;
};
