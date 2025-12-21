import { Test, TestingModule } from '@nestjs/testing';
import { AuthServiceService } from './auth-service.service';
import { JwtService } from '@nestjs/jwt';
import { KAFKA_SERVICE } from '@app/kafka';
import { DatabaseService } from '@app/database';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

describe('AuthServiceService', () => {
  let service: AuthServiceService;

  // create mock objects

  const mockKafkaClient = {
    emit: jest.fn(),
    connect: jest.fn(),
  };

  const mockDbService = {
    db: {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnValue([]),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mocked-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthServiceService,
        { provide: KAFKA_SERVICE, useValue: mockKafkaClient },
        { provide: DatabaseService, useValue: mockDbService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthServiceService>(AuthServiceService);

    // Clear mock call history before each test
    jest.clearAllMocks();
  });

  describe('getHello', () => {
    it("should return 'Hello World!'", () => {
      const result = service.getHello();
      expect(result).toBe('Hello World!');
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Mock no existing user
      mockDbService.db.limit.mockReturnValueOnce([]);

      const mockUser = {
        id: 'user-id-123',
        email: 'fiston@withcodewise.com',
        name: 'Fiston',
      };
      mockDbService.db.returning.mockReturnValueOnce([mockUser]);

      const result = await service.register(
        'fiston@withcodewise.com',
        'securePassword',
        'Fiston',
      );

      expect(result).toEqual({
        message: 'User registered successfully',
        userId: 'user-id-123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('securePassword', 10);

      expect(mockKafkaClient.emit).toHaveBeenCalledWith(
        'user.registered',
        expect.objectContaining({
          userId: 'user-id-123',
          email: 'fiston@withcodewise.com',
          name: 'Fiston',
        }),
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      mockDbService.db.limit.mockReturnValueOnce([
        { id: 'existing-user-id', email: 'fiston@withcodewise.com' },
      ]);

      await expect(
        service.register('fiston@withcodewise.com', 'securePassword', 'Fiston'),
      ).rejects.toThrow('User already exists');
    });
  });
});
