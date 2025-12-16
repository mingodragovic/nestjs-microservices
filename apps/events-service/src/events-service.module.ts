import { Module } from '@nestjs/common';
import { EventsServiceController } from './events-service.controller';
import { EventsServiceService } from './events-service.service';
import { KafkaModule } from '@app/kafka';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [KafkaModule.register('events-service-group'), DatabaseModule],
  controllers: [EventsServiceController],
  providers: [EventsServiceService],
})
export class EventsServiceModule {}
