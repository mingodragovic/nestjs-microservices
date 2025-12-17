import { Module } from '@nestjs/common';
import { NotificationsServiceController } from './notifications-service.controller';
import { NotificationsServiceService } from './notifications-service.service';
import { EmailService } from './email.service';

@Module({
  controllers: [NotificationsServiceController],
  providers: [NotificationsServiceService, EmailService],
})
export class NotificationsServiceModule {}
