import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../users/user.entity';
import { Chat } from '../chat/chat.entity';

export type MessageStatus = 'sent' | 'delivered' | 'read';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  text?: string;

  @Column({ nullable: true })
  image?: string;

  @Column({
    type: 'varchar',
    default: 'sent',
  })
  status!: MessageStatus;

  @Column({ nullable: true })
  deliveredAt?: Date;

  @Column({ nullable: true })
  readAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => User, (user: User) => user.messages)
  user!: User;

  @ManyToOne(() => Chat, (chat: Chat) => chat.messages)
  chat!: Chat;

  @ManyToOne(() => Message, { nullable: true })
  replyTo?: Message | null;

  @Column({ nullable: true })
  forwardedFromName?: string;
}