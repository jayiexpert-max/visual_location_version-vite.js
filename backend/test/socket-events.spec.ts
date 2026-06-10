import { SocketEvents } from '@visual-location/shared';

describe('SocketEvents', () => {
  it('includes realtime IoT events', () => {
    expect(SocketEvents.highlightUpdate).toBe('highlight:update');
    expect(SocketEvents.deviceOnline).toBe('device:online');
    expect(SocketEvents.deviceOffline).toBe('device:offline');
    expect(SocketEvents.ioStatus).toBe('io:status');
    expect(SocketEvents.inventoryUpdate).toBe('inventory:update');
  });
});
