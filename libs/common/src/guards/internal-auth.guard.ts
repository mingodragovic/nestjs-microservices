import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import {
  INTERNAL_API_TOKEN,
  INTERNAL_TOKEN_HEADER,
} from '../constants/internal-auth.constants';

/**
 * Rejects any request that did not come through the API gateway.
 *
 * Internal services read the caller's identity from the x-user-id header,
 * which the gateway sets after verifying the JWT. Without this guard anyone
 * who can reach a service directly could set that header to any user id.
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
  private readonly expected = Buffer.from(INTERNAL_API_TOKEN);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers[INTERNAL_TOKEN_HEADER];
    const received = Buffer.from(typeof header === 'string' ? header : '');

    // timingSafeEqual throws on length mismatch, so compare lengths first.
    if (
      received.length !== this.expected.length ||
      !timingSafeEqual(received, this.expected)
    ) {
      throw new UnauthorizedException('Invalid internal token');
    }

    return true;
  }
}
