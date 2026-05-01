import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { User } from './users/user.entity';
import { Message } from './messages/message.entity';
import { ChatModule } from './chat/chat.module';
import { UsersModule } from './users/users.module';
import { Contact } from './contacts/contact.entity';
import { ContactRequest } from './contacts/contact-request.entity';
import { ContactsModule } from './contacts/contacts.module';
import { Chat } from './chat/chat.entity';
import { ChatMember } from './chat/chat-member.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<string>('DB_PORT')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [User, Message, Contact, ContactRequest, Chat, ChatMember],
        synchronize: true,
      }),
    }),

    ChatModule,
    AuthModule,
    UsersModule,
    ContactsModule,
  ],
})
export class AppModule {}