import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../users/user.entity';
import { Message } from '../messages/message.entity';
import { ChatService } from './chat.service';
import { CallService } from './call.service';

type SocketUser = {
  id: number;
  username: string;
  name: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Message)
    private messageRepo: Repository<Message>,

    private chatService: ChatService,
    private callService: CallService,
  ) {}
  private async sendExpoPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
  ) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
      }),
    });
  }

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  private getSocketUser(client: Socket): SocketUser | null {
    const user = client.data.user as SocketUser | undefined;
    return user || null;
  }

  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() data: { username: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = await this.userRepo.findOne({
      where: { username: data.username },
    });

    if (!user) return;

    client.data.user = {
      id: user.id,
      username: user.username,
      name: user.name,
    };

    console.log(`User joined: ${user.username}`);
  }

  @SubscribeMessage('joinChat')
  handleJoinChat(
    @MessageBody() data: { chatId: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data.chatId) return;

    client.join(`chat_${data.chatId}`);

    console.log(`Client ${client.id} joined chat_${data.chatId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { chatId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getSocketUser(client);

    if (!user) return;
    if (!data.chatId) return;

    client.to(`chat_${data.chatId}`).emit('userTyping', {
      chatId: data.chatId,
      userId: user.id,
      username: user.username,
      name: user.name,
    });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @MessageBody() data: { chatId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getSocketUser(client);

    if (!user) return;
    if (!data.chatId) return;

    client.to(`chat_${data.chatId}`).emit('userStopTyping', {
      chatId: data.chatId,
      userId: user.id,
      username: user.username,
      name: user.name,
    });
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: number; chatId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getSocketUser(client);

    if (!user) return;
    if (!data.messageId || !data.chatId) return;

    const message = await this.messageRepo.findOne({
      where: { id: data.messageId },
      relations: ['chat'],
    });

    if (!message) {
      console.log('Message not found');
      return;
    }

    await this.messageRepo.delete(data.messageId);

    this.server.to(`chat_${data.chatId}`).emit('messageDeleted', {
      messageId: data.messageId,
      chatId: data.chatId,
    });

    console.log('MESSAGE DELETED:', data.messageId);
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    @MessageBody() data: { messageId: number; chatId: number; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getSocketUser(client);

    if (!user) return;
    if (!data.messageId || !data.chatId) return;
    if (!data.text?.trim()) return;

    const message = await this.messageRepo.findOne({
      where: { id: data.messageId },
      relations: ['user', 'chat'],
    });

    if (!message) {
      console.log('Message not found');
      return;
    }

    if (message.user.id !== user.id) {
      console.log('You cannot edit this message');
      return;
    }

    message.text = data.text.trim();

    await this.messageRepo.save(message);

    const updatedMessage = await this.messageRepo.findOne({
      where: { id: message.id },
      relations: ['user', 'chat'],
    });

    this.server.to(`chat_${data.chatId}`).emit('messageEdited', updatedMessage);

    console.log('MESSAGE EDITED:', data.messageId);
  }
  @SubscribeMessage('markMessagesDelivered')
  async handleMarkMessagesDelivered(
    @MessageBody() data: { chatId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getSocketUser(client);

    if (!user) return;
    if (!data.chatId) return;

    const updatedMessages = await this.chatService.markMessagesAsDelivered(
      data.chatId,
      user.id,
    );

    if (updatedMessages.length === 0) return;

    this.server.to(`chat_${data.chatId}`).emit('messagesStatusUpdated', {
      chatId: data.chatId,
      messageIds: updatedMessages.map((message) => message.id),
      status: 'delivered',
    });
  }

  @SubscribeMessage('markMessagesRead')
  async handleMarkMessagesRead(
    @MessageBody() data: { chatId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getSocketUser(client);

    if (!user) return;
    if (!data.chatId) return;

    const updatedMessages = await this.chatService.markMessagesAsRead(
      data.chatId,
      user.id,
    );

    if (updatedMessages.length === 0) return;

    this.server.to(`chat_${data.chatId}`).emit('messagesStatusUpdated', {
      chatId: data.chatId,
      messageIds: updatedMessages.map((message) => message.id),
      status: 'read',
    });
  }
  @SubscribeMessage('acceptCall')
  handleAcceptCall(
    @MessageBody() data: { chatId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getSocketUser(client);

    if (!user) return;
    if (!data.chatId) return;

    client.to(`chat_${data.chatId}`).emit('callAccepted', {
      chatId: data.chatId,
      userId: user.id,
      name: user.name,
      username: user.username,
    });

    console.log('CALL ACCEPTED BY:', user.username);
  }

  @SubscribeMessage('rejectCall')
  handleRejectCall(
    @MessageBody() data: { chatId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getSocketUser(client);

    if (!user) return;
    if (!data.chatId) return;

    client.to(`chat_${data.chatId}`).emit('callRejected', {
      chatId: data.chatId,
      userId: user.id,
      name: user.name,
      username: user.username,
    });
  }
  @SubscribeMessage('endCall')
  handleEndCall(
    @MessageBody() data: { chatId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getSocketUser(client);

    if (!user) return;
    if (!data.chatId) return;

    client.to(`chat_${data.chatId}`).emit('callEnded', {
      chatId: data.chatId,
      userId: user.id,
      name: user.name,
      username: user.username,
    });

    console.log('CALL ENDED BY:', user.username);
  }
  @SubscribeMessage('callUser')
  async handleCallUser(
    @MessageBody() data: { chatId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getSocketUser(client);

    if (!user) return;
    if (!data.chatId) return;

    const result = await this.callService.handleCall(user, data.chatId);

    if (!result) return;

    const { receiver, caller } = result;

    client.to(`chat_${data.chatId}`).emit('incomingCall', {
      chatId: data.chatId,
      callerId: caller.id,
      callerName: caller.name,
      callerUsername: caller.username,
    });

    if (receiver.expoPushToken) {
      await this.sendExpoPushNotification(
        receiver.expoPushToken,
        'Вхідний дзвінок',
        `${caller.name} телефонує вам`,
      );
    }

    console.log('CALL FROM:', caller.username, 'TO:', receiver.username);
  }
  @SubscribeMessage('webrtcOffer')
  handleWebrtcOffer(
    @MessageBody() data: { chatId: number; offer: any },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`chat_${data.chatId}`).emit('webrtcOffer', data);
  }

  @SubscribeMessage('webrtcAnswer')
  handleWebrtcAnswer(
    @MessageBody() data: { chatId: number; answer: any },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`chat_${data.chatId}`).emit('webrtcAnswer', data);
  }

  @SubscribeMessage('webrtcIceCandidate')
  handleWebrtcIceCandidate(
    @MessageBody() data: { chatId: number; candidate: any },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`chat_${data.chatId}`).emit('webrtcIceCandidate', data);
  }
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody()
    data: {
      text: string;
      chatId: number;
      replyToId?: number;
      forwardedFromName?: string;
    },

    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getSocketUser(client);

    if (!user) {
      console.log('No user in socket');
      return;
    }

    if (!data.chatId) {
      console.log('No chatId');
      return;
    }

    if (!data.text?.trim()) {
      console.log('Empty message');
      return;
    }

    client.join(`chat_${data.chatId}`);

    let replyToMessage: Message | null = null;

    if (data.replyToId) {
      replyToMessage = await this.messageRepo.findOne({
        where: { id: data.replyToId },
      });
    }

    const message = this.messageRepo.create({
      text: data.text.trim(),
      user: { id: user.id },
      chat: { id: data.chatId },
      replyTo: replyToMessage || null,
      forwardedFromName: data.forwardedFromName || undefined,
      status: 'sent',
    });

    await this.messageRepo.save(message);

    const fullMessage = await this.messageRepo.findOne({
      where: { id: message.id },
      relations: ['user', 'chat', 'replyTo', 'replyTo.user'],
    });
    console.log('PUSH CHECK START');
    const receiver = await this.callService.getReceiver(user.id, data.chatId);
    console.log('Receiver:', receiver?.username, receiver?.expoPushToken);
    if (receiver?.expoPushToken) {
      await this.sendExpoPushNotification(
        receiver.expoPushToken,
        user.name,
        data.text.trim(),
      );
    }
    console.log('MESSAGE SAVED:', fullMessage?.id);

    this.server.to(`chat_${data.chatId}`).emit('newMessage', fullMessage);
  }
}