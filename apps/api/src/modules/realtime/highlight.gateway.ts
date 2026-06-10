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
    this.server.emit(SocketEvents.highlightUpdate, payload);
  }

  emitHighlightClear(): void {
    this.server.emit(SocketEvents.highlightClear, null);
  }

  emitPicklistCount(count: number): void {
    this.server.emit(SocketEvents.picklistCount, { count });
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
