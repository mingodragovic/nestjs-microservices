import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { EventsModule } from './events/events.module';
import { JwtStrategy } from 'apps/auth-service/src/jwt.strategy';
import { TicketsModule } from './tickets/ticket.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedis } from './throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    AuthModule,
    EventsModule,
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtStrategy,
    ThrottlerStorageRedis,
    {
      provide: 'ThrottlerStorage',
      useClass: ThrottlerStorageRedis,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
