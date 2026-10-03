import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from '../../../src/services/auth.service.js';
import { User } from '../../../src/models/index.js';
import { ConflictError, InvalidCredentialsError, TokenReuseError } from '../../../src/utils/errors.js';

// Mock argon2 to avoid slow hashing in tests
vi.mock('argon2', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$argon2id$mock-hash'),
    verify: vi.fn().mockResolvedValue(true),
    argon2id: 2,
  },
}));

const VALID_USER = { name: 'Test User', email: 'test@example.com', password: 'Password123' };

describe('auth.service', () => {
  beforeEach(async () => {
    // DB is cleaned by the global setup.ts afterEach
  });

  // ── Register ────────────────────────────────────────────────────────────────

  it('UT-AUTH-01: registers a new user and returns tokens', async () => {
    const result = await authService.register(VALID_USER);

    expect(result.user.email).toBe('test@example.com');
    expect(result.user.name).toBe('Test User');
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
  });

  it('UT-AUTH-02: throws ConflictError on duplicate email', async () => {
    await authService.register(VALID_USER);
    await expect(authService.register(VALID_USER)).rejects.toThrow(ConflictError);
  });

  it('UT-AUTH-09: password is stored as argon2id hash', async () => {
    const argon2 = await import('argon2');
    await authService.register(VALID_USER);
    expect(argon2.default.hash).toHaveBeenCalledWith(
      VALID_USER.password,
      expect.objectContaining({ type: 2 }),
    );
  });

  // ── Login ───────────────────────────────────────────────────────────────────

  it('UT-AUTH-03: login with correct credentials returns tokens', async () => {
    await authService.register(VALID_USER);
    const result = await authService.login({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });

    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
  });

  it('UT-AUTH-05: login with nonexistent email throws InvalidCredentialsError', async () => {
    await expect(
      authService.login({ email: 'nobody@example.com', password: 'anything' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('UT-AUTH-04: login with wrong password throws InvalidCredentialsError', async () => {
    const argon2 = await import('argon2');
    vi.mocked(argon2.default.verify).mockResolvedValueOnce(false);

    await authService.register(VALID_USER);
    await expect(
      authService.login({ email: VALID_USER.email, password: 'wrongpassword' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  // ── Refresh ─────────────────────────────────────────────────────────────────

  it('UT-AUTH-06: refresh with valid token issues new token pair', async () => {
    const { tokens } = await authService.register(VALID_USER);
    const newTokens = await authService.refresh(tokens.refreshToken);

    expect(newTokens.accessToken).toBeTruthy();
    expect(newTokens.refreshToken).toBeTruthy();
    expect(newTokens.refreshToken).not.toBe(tokens.refreshToken);
  });

  it('UT-AUTH-07: refresh with invalid token throws error', async () => {
    const { InvalidRefreshTokenError } = await import('../../../src/utils/errors.js');
    await expect(authService.refresh('completely.invalid.token')).rejects.toThrow(
      InvalidRefreshTokenError,
    );
  });

  it('UT-AUTH-08: refresh token reuse triggers family revocation', async () => {
    const { tokens } = await authService.register(VALID_USER);

    // Use the token once (rotation)
    await authService.refresh(tokens.refreshToken);

    // Reuse the old token — should revoke all sessions
    await expect(authService.refresh(tokens.refreshToken)).rejects.toThrow(TokenReuseError);

    // Verify user's refreshTokenHash is now cleared
    const user = await User.findOne({ email: VALID_USER.email }).select('+refreshTokenHash');
    expect(user?.refreshTokenHash).toBeUndefined();
  });

  // ── Logout ──────────────────────────────────────────────────────────────────

  it('logout clears the refresh token hash', async () => {
    const { user } = await authService.register(VALID_USER);
    await authService.logout(user.id as string);

    const updated = await User.findById(user.id).select('+refreshTokenHash');
    expect(updated?.refreshTokenHash).toBeUndefined();
  });
});
