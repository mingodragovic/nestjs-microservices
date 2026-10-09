import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InternalAuthGuard } from './internal-auth.guard';
import {
  INTERNAL_API_TOKEN,
  INTERNAL_TOKEN_HEADER,
} from '../constants/internal-auth.constants';

function contextWithHeaders(headers: Record<string, string>) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('InternalAuthGuard', () => {
  const guard = new InternalAuthGuard();

  it('allows requests carrying the internal token', () => {
    const context = contextWithHeaders({
      [INTERNAL_TOKEN_HEADER]: INTERNAL_API_TOKEN,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects requests without the token, even with identity headers', () => {
    const context = contextWithHeaders({ 'x-user-id': 'any-user' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a wrong token of the same length', () => {
    const wrong = 'x'.repeat(INTERNAL_API_TOKEN.length);
    const context = contextWithHeaders({ [INTERNAL_TOKEN_HEADER]: wrong });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
