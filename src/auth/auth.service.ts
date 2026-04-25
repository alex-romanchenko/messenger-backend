import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    private jwtService: JwtService,
  ) {}

  async register(name: string, username: string, password: string) {
    const existingUser = await this.userRepo.findOne({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepo.create({
      name,
      username,
      password: hashedPassword,
    });

    await this.userRepo.save(user);

    const token = this.jwtService.sign({
      sub: user.id,
      name: user.name,
      username: user.username,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
    };
  }

  async login(username: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid login or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid login or password');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      name: user.name,
      username: user.username,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
    };
  }
}