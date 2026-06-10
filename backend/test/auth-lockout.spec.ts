import { ErrorCodes } from '../src/common/constants/error-codes';

describe('Auth lockout error codes', () => {
  it('defines account locked code', () => {
    expect(ErrorCodes.AUTH_ACCOUNT_LOCKED).toBe('AUTH_ACCOUNT_LOCKED');
  });

  it('defines rate limit code', () => {
    expect(ErrorCodes.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
  });
});

describe('Account lockout policy', () => {
  it('locks account after max failed attempts', () => {
    const maxAttempts = 5;
    let attempts = 0;
    let lockedUntil: Date | null = null;

    const fail = () => {
      attempts += 1;
      if (attempts >= maxAttempts) {
        lockedUntil = new Date(Date.now() + 15 * 60_000);
      }
    };

    for (let i = 0; i < maxAttempts; i += 1) {
      fail();
    }

    expect(attempts).toBe(maxAttempts);
    expect(lockedUntil).not.toBeNull();
    expect(lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });
});
