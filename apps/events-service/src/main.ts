import { NestFactory } from '@nestjs/core';
import { EventsServiceModule } from './events-service.module';
import { ValidationPipe } from '@nestjs/common';
import { InternalAuthGuard, SERVICES_PORTS } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(EventsServiceModule);

  //Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Only accept requests forwarded by the API gateway
  app.useGlobalGuards(new InternalAuthGuard());

  await app.listen(SERVICES_PORTS.EVENTS_SERVICE);
  console.log(
    `Events Service is running on port ${SERVICES_PORTS.EVENTS_SERVICE}`,
  );
}
bootstrap();
