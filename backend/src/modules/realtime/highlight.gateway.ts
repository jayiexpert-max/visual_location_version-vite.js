import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { SocketEvents } from '@visual-location/shared';
import { Server, Socket } from 'socket.io';
import type { TvHighlightResponseDto } from '../tv/dto/tv-highlight.dto';

export interface IoStatusEventPayload {
  topic: string;
  payload: Record<string, unknown>;
  deviceId: number | null;
  timestamp: string;
}

export interface DevicePresencePayload {
  deviceId: number;
  ip?: string;
  timestamp: string;
}

export interface InventoryUpdatePayload {
  rackId: number;
  boxId?: number;
  slotId?: number;
  action: string;
  timestamp: string;
}

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class HighlightGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(HighlightGateway.name);
  private readonly recentEvents: Array<{
    event: string;
    payload: unknown;
    timestamp: string;
  }> = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(): void {
    this.logger.log('Socket.IO gateway initialized at /realtime');
  }

  async handleConnection(client: Socket): Promise<void> {
    const authenticated = await this.authenticateClient(client);
    if (!authenticated) {
      client.disconnect(true);
    }
  }

  emitHighlightUpdate(payload: TvHighlightResponseDto): void {
    this.broadcast(SocketEvents.highlightUpdate, payload);
  }

  emitHighlightClear(): void {
    this.broadcast(SocketEvents.highlightClear, null);
  }

  emitPicklistCount(count: number): void {
    this.broadcast(SocketEvents.picklistCount, { count });
  }

  emitDeviceOnline(payload: DevicePresencePayload): void {
    this.broadcast(SocketEvents.deviceOnline, payload);
  }

  emitDeviceOffline(payload: DevicePresencePayload): void {
    this.broadcast(SocketEvents.deviceOffline, payload);
  }

  emitIoStatus(payload: IoStatusEventPayload): void {
    this.broadcast(SocketEvents.ioStatus, payload);
  }

  emitInventoryUpdate(payload: InventoryUpdatePayload): void {
    this.broadcast(SocketEvents.inventoryUpdate, payload);
  }

  getRecentEvents(limit = 50): typeof this.recentEvents {
    return this.recentEvents.slice(-limit);
  }

  getActiveConnectionCount(): number {
    return this.server?.sockets?.sockets?.size ?? 0;
  }

  @SubscribeMessage('picklist:subscribe')
  handlePicklistSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { count?: number },
  ): void {
    if (typeof body?.count === 'number') {
      client.emit(SocketEvents.picklistCount, { count: body.count });
    }
  }

  private broadcast(event: string, payload: unknown): void {
    this.server.emit(event, payload);
    this.recentEvents.push({
      event,
      payload,
      timestamp: new Date().toISOString(),
    });
    if (this.recentEvents.length > 200) {
      this.recentEvents.splice(0, this.recentEvents.length - 200);
    }
  }

  private async authenticateClient(client: Socket): Promise<boolean> {
    const auth = client.handshake.auth as {
      token?: string;
      kioskKey?: string;
    };

    const kioskKey = auth.kioskKey ?? client.handshake.headers['x-tv-kiosk-key'];
    const configuredKioskKey = this.configService.get<string>('tv.kioskKey');

    if (
      configuredKioskKey &&
      typeof kioskKey === 'string' &&
      kioskKey === configuredKioskKey
    ) {
      return true;
    }

    const token = auth.token;
    if (!token || typeof token !== 'string') {
      this.logger.warn(`Socket connection rejected: missing credentials (${client.id})`);
      return false;
    }

    try {
      await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      });
      return true;
    } catch {
      this.logger.warn(`Socket connection rejected: invalid JWT (${client.id})`);
      return false;
    }
  }
}
