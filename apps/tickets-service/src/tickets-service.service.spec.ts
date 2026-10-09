import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { KAFKA_SERVICE } from '@app/kafka';
import { TicketsServiceService } from './tickets-service.service';

// A chainable stand-in for a Drizzle query builder. Every builder method
// returns the same object, and awaiting it resolves to `result`.
function mockQuery(result: unknown) {
  const query: Record<string, jest.Mock> & PromiseLike<unknown> = {
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  } as Record<string, jest.Mock> & PromiseLike<unknown>;
  for (const method of [
    'select',
    'from',
    'where',
    'limit',
    'for',
    'innerJoin',
    'insert',
    'values',
    'update',
    'set',
    'returning',
  ]) {
    query[method] = jest.fn(() => query);
  }
  return query;
}

describe('TicketsServiceService', () => {
  let service: TicketsServiceService;

  // Results for successive db.select / db.insert / db.update calls, in order.
  let results: unknown[];
  let queries: ReturnType<typeof mockQuery>[];

  const nextQuery = () => {
    const query = mockQuery(results.shift());
    queries.push(query);
    return query;
  };

  const db = {
    select: jest.fn(() => nextQuery()),
    insert: jest.fn(() => nextQuery()),
    update: jest.fn(() => nextQuery()),
    transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(db)),
  };

  const mockKafkaClient = { emit: jest.fn(), connect: jest.fn() };

  const publishedEvent = {
    id: 'event-1',
    title: 'NestJS Conf',
    status: 'PUBLISHED',
    capacity: 10,
    price: 2500,
    organizerId: 'organizer-1',
  };

  beforeEach(async () => {
    results = [];
    queries = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsServiceService,
        { provide: KAFKA_SERVICE, useValue: mockKafkaClient },
        { provide: DatabaseService, useValue: { db } },
      ],
    }).compile();

    service = module.get(TicketsServiceService);
  });

  describe('purchase', () => {
    it('locks the event row inside a transaction before counting seats', async () => {
      results = [
        [publishedEvent],
        [{ total: '0' }],
        [
          {
            id: 'ticket-1',
            eventId: 'event-1',
            userId: 'user-1',
            quantity: 2,
            totalPrice: 5000,
            ticketCode: 'ABC123',
            status: 'CONFIRMED',
          },
        ],
      ];

      await service.purchase(
        { eventId: 'event-1', quantity: 2 },
        'user-1',
        'buyer@example.com',
      );

      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(queries[0].for).toHaveBeenCalledWith('update');
    });

    it('rejects a purchase larger than the remaining capacity', async () => {
      // Postgres returns SUM() over integers as a bigint string.
      results = [[publishedEvent], [{ total: '9' }]];

      await expect(
        service.purchase(
          { eventId: 'event-1', quantity: 2 },
          'user-1',
          'a@b.c',
        ),
      ).rejects.toThrow(new BadRequestException('Only 1 tickets remaining'));
      expect(db.insert).not.toHaveBeenCalled();
      expect(mockKafkaClient.emit).not.toHaveBeenCalled();
    });

    it('rejects events that are not published', async () => {
      results = [[{ ...publishedEvent, status: 'DRAFT' }]];

      await expect(
        service.purchase(
          { eventId: 'event-1', quantity: 1 },
          'user-1',
          'a@b.c',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("includes the buyer's email and event title in ticket.purchased", async () => {
      results = [
        [publishedEvent],
        [{ total: '0' }],
        [
          {
            id: 'ticket-1',
            eventId: 'event-1',
            userId: 'user-1',
            quantity: 1,
            totalPrice: 2500,
            ticketCode: 'ABC123',
            status: 'CONFIRMED',
          },
        ],
      ];

      await service.purchase(
        { eventId: 'event-1', quantity: 1 },
        'user-1',
        'buyer@example.com',
      );

      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        'ticket.purchased',
        expect.objectContaining({
          email: 'buyer@example.com',
          eventTitle: 'NestJS Conf',
          totalPrice: 2500,
        }),
      );
    });
  });

  describe('checkIn', () => {
    it('joins the events table to find the organizer', async () => {
      results = [
        [{ id: 'ticket-1', status: 'CONFIRMED', organizerId: 'organizer-1' }],
        [{ id: 'ticket-1', eventId: 'event-1', ticketCode: 'ABC123' }],
      ];

      await service.checkIn('ABC123', 'organizer-1');

      expect(queries[0].innerJoin).toHaveBeenCalled();
      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        'ticket.checked-in',
        expect.objectContaining({ ticketId: 'ticket-1' }),
      );
    });

    it('returns 404 for an unknown ticket code', async () => {
      results = [[]];

      await expect(service.checkIn('NOPE', 'organizer-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it("forbids checking in another organizer's ticket", async () => {
      results = [
        [{ id: 'ticket-1', status: 'CONFIRMED', organizerId: 'organizer-1' }],
      ];

      await expect(service.checkIn('ABC123', 'someone-else')).rejects.toThrow(
        ForbiddenException,
      );
      expect(db.update).not.toHaveBeenCalled();
    });

    it('returns 409 when a concurrent request changed the status first', async () => {
      results = [
        [{ id: 'ticket-1', status: 'CONFIRMED', organizerId: 'organizer-1' }],
        [], // conditional UPDATE matched no rows
      ];

      await expect(service.checkIn('ABC123', 'organizer-1')).rejects.toThrow(
        ConflictException,
      );
      expect(mockKafkaClient.emit).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('returns 409 when a concurrent request changed the status first', async () => {
      results = [
        [{ id: 'ticket-1', userId: 'user-1', status: 'CONFIRMED' }],
        [],
      ];

      await expect(
        service.cancel('ticket-1', 'user-1', 'a@b.c'),
      ).rejects.toThrow(ConflictException);
      expect(mockKafkaClient.emit).not.toHaveBeenCalled();
    });

    it("forbids cancelling another user's ticket", async () => {
      results = [[{ id: 'ticket-1', userId: 'user-1', status: 'CONFIRMED' }]];

      await expect(
        service.cancel('ticket-1', 'intruder', 'a@b.c'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
