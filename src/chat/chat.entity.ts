import {
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatMember } from './chat-member.entity';
import { Message } from '../messages/message.entity';

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => ChatMember, (member: ChatMember) => member.chat)
  members!: ChatMember[];

  @OneToMany(() => Message, (message: Message) => message.chat)
  messages!: Message[];
}