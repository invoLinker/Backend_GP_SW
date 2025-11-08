import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { db } from './firebase.config';
import { UsersService } from '../users/users.service';
import * as fs from 'fs';
import * as path from 'path';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway
  ) {}

  private messagesRef = db.collection('messages');
  // private messages = db.collection('Groupmessages');


  async sendMessage(
    senderId: number,
    receiverId: number,
    content: string,
    files?: Express.Multer.File[],
  ) {
    const sender = await this.usersService.findOne(senderId);
    const receiver = await this.usersService.findOne(receiverId);

    if (!sender || !receiver) throw new NotFoundException('User not found');

const savedFiles: { filename: string; path: string }[] = [];
if (files && files.length > 0) {
  const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'chatFiles', `${senderId}_${receiverId}`);
  fs.mkdirSync(uploadDir, { recursive: true });

  for (const file of files) {
    const filePath = path.join(uploadDir, file.originalname);
    fs.writeFileSync(filePath, file.buffer);
    savedFiles.push({
      filename: file.originalname,
      path: `https://qrmvq13r-4000.uks1.devtunnels.ms/uploads/chatFiles/${senderId}_${receiverId}/${file.originalname}`
    });
  }
}

  const message = {
    id: Date.now().toString(), 
    senderId: senderId.toString(),
    receiverId: receiverId.toString(),
    content,
    files: savedFiles,
    timestamp: new Date().toISOString(),
  };

    await this.messagesRef.add(message);

    const allMessages = await this.getConversation(senderId, receiverId);
    this.chatGateway.server.to(`user_${receiverId}`).emit('newMessage', message);


    return { success: true, message: 'Message sent', data: message };
  }


// async getConversation(userA: number, userB: number) {
//   const snapshot = await this.messagesRef
//     .where('senderId', 'in', [userA.toString(), userB.toString()])
//     .where('receiverId', 'in', [userA.toString(), userB.toString()])
//     .orderBy('timestamp', 'asc')
//     .get();

//   const allMessages = snapshot.docs.map(doc => {
//     const data = doc.data();
//     return {
//       senderId: data.senderId,
//       receiverId: data.receiverId,
//       content: data.content,
//       files: data.files || [],
//       timestamp:
//         data.timestamp && typeof data.timestamp.toDate === 'function'
//           ? data.timestamp.toDate().toISOString()
//           : new Date(data.timestamp || Date.now()).toISOString(),
//     };
//   });

//   allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
//   return allMessages;
// }

async getConversation(userA: number, userB: number) {
  const AtoB = await this.messagesRef
    .where('senderId', '==', userA.toString())
    .where('receiverId', '==', userB.toString())
    .get();

  const BtoA = await this.messagesRef
    .where('senderId', '==', userB.toString())
    .where('receiverId', '==', userA.toString())
    .get();

  const list1 = AtoB.docs.map(doc => doc.data());
  const list2 = BtoA.docs.map(doc => doc.data());

  const all = [...list1, ...list2].map(m => ({
    senderId: m.senderId,
    receiverId: m.receiverId,
    content: m.content,
    files: m.files || [],
    timestamp:
      m.timestamp && typeof m.timestamp.toDate === 'function'
        ? m.timestamp.toDate().toISOString()
        : new Date(m.timestamp || Date.now()).toISOString(),
  }));

  all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return all;
}


// async getGroupConversation() {
//   const snapshot = await this.messages.get();
//   const allDocs = snapshot.docs.map(doc => doc.data());

//   // فلترة حسب isGroup
//   const messages = allDocs
//     .filter(msg => msg.isGroup)
//     .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

//   return messages;
// }


// async sendMessageToGroupChat(
//   senderId: number,
//   content: string,
//   files?: Express.Multer.File[],
// ) {
//   const sender = await this.usersService.findOne(senderId);
//   if (!sender) throw new NotFoundException('User not found');

//   // حفظ الملفات
//   const savedFiles: { filename: string; path: string }[] = [];
//   if (files && files.length > 0) {
//     const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'group_chat');
//     fs.mkdirSync(uploadDir, { recursive: true });

//     for (const file of files) {
//       const filePath = path.join(uploadDir, file.originalname);
//       fs.writeFileSync(filePath, file.buffer);
//       savedFiles.push({
//         filename: file.originalname,
//         path: `https://qrmvq13r-4000.uks1.devtunnels.ms/uploads/group_chat/${file.originalname}`,
//       });
//     }
//   }

//   const message = {
//     id: Date.now().toString(),
//     senderId: senderId.toString(),
//     content,
//     files: savedFiles,
//     timestamp: new Date().toISOString(),
//     isGroup: true,
//   };

//   await this.messages.add(message);

  
//   await this.getGroupConversation();
//   this.chatGateway.server.to('group_chat').emit('newGroupMessage', message);

//   return { success: true, message: 'Message sent', data: message };
// }





}
