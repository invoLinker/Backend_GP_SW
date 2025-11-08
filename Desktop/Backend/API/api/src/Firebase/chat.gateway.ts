import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: true })
@Injectable()
export class ChatGateway {
    
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService
  ) {}

  @SubscribeMessage('newMessage')
async handleMessage(
  @MessageBody() data: { senderId: number; receiverId: number; content: string },
  @ConnectedSocket() client: Socket,
) {
  const message = await this.chatService.sendMessage(data.senderId, data.receiverId, data.content);

  return message;
}

// @SubscribeMessage('newGroupMessage')
// async handleGroupMessage(
//   @MessageBody() data: { senderId: number; content: string },
// ) {
//   const message = await this.chatService.sendMessageToGroupChat(
//     data.senderId,
//         data.content,
//   );

//   // إرسال لجميع الموجودين في الغرفة
//   // this.server.to('all').emit('newGroupMessage', message);

//   return message;
// }

handleConnection(client: Socket) {
  const userId = client.handshake.query.userId as string;
  if (userId) {
    client.join(`user_${userId}`);
    // client.join('group_chat'); // كل المستخدمين يدخلوا نفس الغرفة
    console.log(`User ${userId} connected to rooms user_${userId} and group_chat`);
  }}


  handleDisconnect(client: Socket) {
    console.log(`❌ User disconnected: ${client.id}`);
  }

 
}
