import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { INTERNAL_API_TOKEN, INTERNAL_TOKEN_HEADER } from '@app/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [
    HttpModule.register({
      headers: { [INTERNAL_TOKEN_HEADER]: INTERNAL_API_TOKEN },
    }),
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
