export const MqttTopics = {
  highlight: (deviceId: number) => `visual/io/${deviceId}/highlight`,
  off: (deviceId: number) => `visual/io/${deviceId}/off`,
  reset: 'visual/io/reset',
  factoryLocationLight: 'factory/location/light',
  factoryLocationStatus: 'factory/location/status',
  factoryDeviceStatus: 'factory/device/status',
  factoryRackStatus: 'factory/rack/status',
} as const;
