import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async searchByUsername(username: string) {
    return this.userRepo.find({
      where: {
        username: ILike(`%${username}%`),
      },
      select: {
        id: true,
        name: true,
        username: true,
      },
      take: 10,
    });
  }
}