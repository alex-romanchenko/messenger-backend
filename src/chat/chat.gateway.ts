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
  ) {}

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
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

    client.data.user = user;

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

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { text: string; chatId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

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

    const message = this.messageRepo.create({
      text: data.text.trim(),
      user,
      chat: { id: data.chatId },
    });

    await this.messageRepo.save(message);

    const fullMessage = await this.messageRepo.findOne({
      where: { id: message.id },
      relations: ['user', 'chat'],
    });

    console.log('MESSAGE SAVED:', fullMessage?.id);
    console.log(`EMIT TO ROOM: chat_${data.chatId}`);

    this.server.to(`chat_${data.chatId}`).emit('newMessage', fullMessage);
  }
}