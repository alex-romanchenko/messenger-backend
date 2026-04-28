import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Chat } from '../chat/chat.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  text!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => User, (user: User) => user.messages)
  user!: User;

  @ManyToOne(() => Chat, (chat: Chat) => chat.messages)
  chat!: Chat;
}