import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
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
        avatar: true,
      },
      take: 10,
    });
  }
  async updatePassword(userId: number, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  await this.userRepo.update(userId, {
    password: hashedPassword,
  });

  return {
    message: 'Password updated',
  };
}
  async updateProfile(userId: number, name: string, username: string) {
    const existingUser = await this.userRepo.findOne({
      where: { username },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException('Username already exists');
    }

    await this.userRepo.update(userId, {
      name,
      username,
    });

    return this.userRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
      },
    });
  }

  async updateAvatar(userId: number, filename: string) {
    const avatarUrl = `/uploads/avatars/${filename}`;

    await this.userRepo.update(userId, {
      avatar: avatarUrl,
    });

    return {
      avatar: avatarUrl,
    };
  }
  async updatePushToken(userId: number, expoPushToken: string) {
    await this.userRepo.update(userId, {
    expoPushToken,
    });

    return {
      message: 'Push token saved',
    };
}
}