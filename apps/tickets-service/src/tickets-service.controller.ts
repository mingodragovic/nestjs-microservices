import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { TicketsServiceService } from './tickets-service.service';
import { CheckInTicketDto, PurchaseTicketDto } from '@app/common';

@Controller()
export class TicketsServiceController {
  constructor(private readonly ticketsServiceService: TicketsServiceService) {}

  @Post('purchase')
  purchase(
    @Body() purchaseDto: PurchaseTicketDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.ticketsServiceService.purchase(purchaseDto, userId);
  }

  @Get('my-tickets')
  findMyTickets(@Headers('x-user-id') userId: string) {
    return this.ticketsServiceService.findMyTicket(userId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.ticketsServiceService.findOne(id, userId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.ticketsServiceService.cancel(id, userId);
  }

  @Post('check-in')
  checkIn(
    @Body() checkInDto: CheckInTicketDto,
    @Headers('x-user-id') organizerId: string,
  ) {
    return this.ticketsServiceService.checkIn(
      checkInDto.ticketCode,
      organizerId,
    );
  }

  @Get('event/:eventId')
  findEventTickets(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Headers('x-user-id') organizerId: string,
  ) {
    return this.ticketsServiceService.findEventTickst(eventId, organizerId);
  }
}
