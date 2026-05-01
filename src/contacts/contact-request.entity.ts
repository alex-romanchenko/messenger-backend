import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../users/user.entity';

export type ContactRequestStatus = 'pending' | 'accepted' | 'rejected';

@Entity('contact_requests')
export class ContactRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  sender: User;

  @ManyToOne(() => User, { eager: true })
  receiver: User;

  @Column({
    type: 'varchar',
    default: 'pending',
  })
  status: ContactRequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}