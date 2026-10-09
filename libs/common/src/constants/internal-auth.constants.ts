// Header the API gateway uses to prove a request came from inside the system.
// Downstream services trust identity headers such as x-user-id only when this
// header carries the shared token.
export const INTERNAL_TOKEN_HEADER = 'x-internal-token';

export const INTERNAL_API_TOKEN =
  process.env.INTERNAL_API_TOKEN || 'dev-internal-token';
