import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';

@Module({
  imports: [HttpModule],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketsModule {}
