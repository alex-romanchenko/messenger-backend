import {
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('contacts')
@Unique(['owner', 'friend'])
export class Contact {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User)
  owner!: User;

  @ManyToOne(() => User)
  friend!: User;

  @CreateDateColumn()
  createdAt!: Date;
}