import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Request,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto } from '@app/common';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  // Protected - get my events
  @UseGuards(AuthGuard('jwt'))
  @Get('my-events')
  findMyEvents(@Request() req: { user: { userId: string } }) {
    return this.eventsService.findMyEvents(req.user.userId);
  }

  //Public - get a single event
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Body() createEventDto: CreateEventDto,
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.eventsService.create(
      createEventDto,
      req.user.userId,
      req.user.role || 'USER',
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.eventsService.update(
      id,
      updateEventDto,
      req.user.userId,
      req.user.role || 'USER',
    );
  }

  // Protected - publish event
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/publish')
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.eventsService.publish(
      id,
      req.user.userId,
      req.user.role || 'USER',
    );
  }

  // Protected - cancel event
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { userId: string; role?: string } },
  ) {
    return this.eventsService.cancel(
      id,
      req.user.userId,
      req.user.role || 'USER',
    );
  }
}
