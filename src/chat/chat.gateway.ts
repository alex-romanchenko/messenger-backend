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
  server: Server;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
  ) {}

  async handleConnection(client: Socket) {
    console.log('Client connected:', client.id);

    const messages = await this.messageRepo.find({
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    client.emit('messages', messages);
  }

  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() data: { name: string },
    @ConnectedSocket() client: Socket,
  ) {
    let user = await this.userRepo.findOne({
      where: { name: data.name },
    });

    if (!user) {
      user = this.userRepo.create({ name: data.name });
      await this.userRepo.save(user);
    }

    client.data.user = user;

    console.log(`User joined: ${user.name}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;

    if (!user) return;

    const message = this.messageRepo.create({
      text: data.text,
      user,
    });

    await this.messageRepo.save(message);

    const fullMessage = await this.messageRepo.findOne({
      where: { id: message.id },
      relations: ['user'],
    });

    this.server.emit('newMessage', fullMessage);
  }
}