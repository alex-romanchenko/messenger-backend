import {
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Chat } from './chat.entity';
import { User } from '../users/user.entity';

@Entity('chat_members')
@Unique(['chat', 'user'])
export class ChatMember {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Chat, (chat: Chat) => chat.members)
  chat!: Chat;

  @ManyToOne(() => User)
  user!: User;
}