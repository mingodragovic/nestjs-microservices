import { Module } from '@nestjs/common';
import { INTERNAL_API_TOKEN, INTERNAL_TOKEN_HEADER } from '@app/common';
import { HttpModule } from '@nestjs/axios';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';

@Module({
  imports: [
    HttpModule.register({
      headers: { [INTERNAL_TOKEN_HEADER]: INTERNAL_API_TOKEN },
    }),
  ],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketsModule {}
