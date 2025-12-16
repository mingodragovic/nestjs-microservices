import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TicketService } from './ticket.service';
import { PurchaseTicketDto, CheckInTicketDto } from '@app/common';

@Controller('tickets')
@UseGuards(AuthGuard('jwt'))
export class TicketController {
  constructor(private readonly ticketsService: TicketService) {}

  @Post('purchase')
  purchase(
    @Body() purchaseDto: PurchaseTicketDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.ticketsService.purchase(purchaseDto, req.user.userId);
  }

  @Get('my-tickets')
  findMyTickets(@Request() req: { user: { userId: string } }) {
    return this.ticketsService.findMyTickets(req.user.userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.ticketsService.findOne(id, req.user.userId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.ticketsService.cancel(id, req.user.userId);
  }

  @Post('check-in')
  checkIn(
    @Body() checkInDto: CheckInTicketDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.ticketsService.checkIn(checkInDto, req.user.userId);
  }

  @Get('event/:eventId')
  findEventTickets(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Request() req: { user: { userId: string } },
  ) {
    return this.ticketsService.findEventTickets(eventId, req.user.userId);
  }
}
