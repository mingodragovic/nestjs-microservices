import { Module } from '@nestjs/common';
import { INTERNAL_API_TOKEN, INTERNAL_TOKEN_HEADER } from '@app/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      headers: { [INTERNAL_TOKEN_HEADER]: INTERNAL_API_TOKEN },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
