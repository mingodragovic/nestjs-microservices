import { Test, TestingModule } from '@nestjs/testing';
import { TicketsServiceController } from './tickets-service.controller';
import { TicketsServiceService } from './tickets-service.service';

describe('TicketsServiceController', () => {
  let ticketsServiceController: TicketsServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [TicketsServiceController],
      providers: [TicketsServiceService],
    }).compile();

    ticketsServiceController = app.get<TicketsServiceController>(TicketsServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(ticketsServiceController.getHello()).toBe('Hello World!');
    });
  });
});
