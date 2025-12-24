import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class ThrottlerStorageRedis
  implements ThrottlerStorage, OnModuleDestroy
{
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    // throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const totalHits = await this.redis.incr(key);

    if (totalHits === 1) {
      await this.redis.pexpire(key, ttl);
    }

    const pttl = await this.redis.pttl(key);
    const timeToExpire = pttl > 0 ? pttl : ttl;
    const isBlocked = totalHits > limit;
    const timeToBlockExpire = isBlocked ? blockDuration : 0;

    return {
      totalHits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
