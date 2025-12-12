import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true })
@Injectable()
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  handleConnection(@ConnectedSocket() client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (userId) {
      const room = `user_${userId}`;
      client.join(room);
      this.logger.log(`✅ User ${userId} connected to notification room ${room}`);
    } else {
      this.logger.warn(`Client ${client.id} connected without userId`);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`❌ User disconnected from notifications: ${client.id}`);
  }

  sendToUser(userId: number | string, payload: any) {
    const room = `user_${userId}`;
    this.server.to(room).emit('new-notification', payload);
    this.logger.log(`📨 Sent notification to ${room}`);
  }
}
