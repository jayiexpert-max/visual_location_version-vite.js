import { MqttTopics } from '@visual-location/shared';

describe('MqttTopics', () => {
  it('builds IO command topics', () => {
    expect(MqttTopics.highlight(1)).toBe('visual/io/1/highlight');
    expect(MqttTopics.off(2)).toBe('visual/io/2/off');
    expect(MqttTopics.reset).toBe('visual/io/reset');
  });

  it('exposes factory status topics', () => {
    expect(MqttTopics.factoryDeviceStatus).toBe('factory/device/status');
    expect(MqttTopics.factoryLocationStatus).toBe('factory/location/status');
    expect(MqttTopics.factoryRackStatus).toBe('factory/rack/status');
  });
});
