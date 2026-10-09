import { NestFactory } from '@nestjs/core';
import { TicketsServiceModule } from './tickets-service.module';
import { ValidationPipe } from '@nestjs/common';
import { InternalAuthGuard, SERVICES_PORTS } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(TicketsServiceModule);

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

  await app.listen(SERVICES_PORTS.TICKETS_SERVICE);
  console.log(
    `Tickets Service is running on port ${SERVICES_PORTS.TICKETS_SERVICE}`,
  );
}
bootstrap();
