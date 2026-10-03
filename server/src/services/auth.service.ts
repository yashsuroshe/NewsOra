import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { User } from '../models/index.js';
import type { IUser } from '../models/index.js';
import { config } from '../config/index.js';
import { sha256 } from '../utils/hash.js';
import {
  ConflictError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  TokenReuseError,
} from '../utils/errors.js';
import type { RegisterInput, LoginInput } from '../validators/auth.schema.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: IUser;
  tokens: TokenPair;
}

// ─── Token Helpers ────────────────────────────────────────────────────────────

function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, config.JWT_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRY,
  } as jwt.SignOptions);
}

function signRefreshToken(userId: string): string {
  // jti = JWT ID: a random nonce that makes every issued token unique,
  // even if signed for the same user within the same second.
  const jti = randomBytes(16).toString('hex');
  return jwt.sign({ sub: userId, jti }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions);
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Register a new user with email/password.
 * Throws ConflictError if email already exists.
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 65536,   // 64 MB
    timeCost: 3,
    parallelism: 4,
  });

  // Create user first to get the ID, then sign refresh token with it
  const user = await User.create({
    name: input.name.trim(),
    email: input.email.toLowerCase().trim(),
    passwordHash,
  });

  const refreshToken = signRefreshToken(user.id as string);
  user.refreshTokenHash = sha256(refreshToken);
  await user.save();

  const tokens: TokenPair = {
    accessToken: signAccessToken(user.id as string, user.email),
    refreshToken,
  };

  return { user, tokens };
}

/**
 * Login with email/password.
 * Throws InvalidCredentialsError on wrong email or password.
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  // Must explicitly select passwordHash since it has select:false
  const user = await User.findOne({ email: input.email.toLowerCase() }).select(
    '+passwordHash +refreshTokenHash',
  );

  if (!user || !user.passwordHash) {
    throw new InvalidCredentialsError();
  }

  const passwordValid = await argon2.verify(user.passwordHash, input.password);
  if (!passwordValid) {
    throw new InvalidCredentialsError();
  }

  const refreshToken = signRefreshToken(user.id as string);
  user.refreshTokenHash = sha256(refreshToken);
  await user.save();

  const tokens: TokenPair = {
    accessToken: signAccessToken(user.id as string, user.email),
    refreshToken,
  };

  return { user, tokens };
}

/**
 * Refresh access token using a valid refresh token.
 * Implements token rotation — old token is invalidated, new one issued.
 * Implements token family protection — reuse of old token revokes all sessions.
 */
export async function refresh(refreshToken: string): Promise<TokenPair> {
  // Verify the JWT signature first
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  } catch {
    throw new InvalidRefreshTokenError();
  }

  const userId = payload['sub'] as string | undefined;
  if (!userId) throw new InvalidRefreshTokenError();

  // Look up user by ID and fetch their stored token hash
  const user = await User.findById(userId).select('+refreshTokenHash');
  if (!user) throw new InvalidRefreshTokenError();

  const incomingHash = sha256(refreshToken);

  // Token reuse detection — if hashes don't match, a previously rotated
  // token was reused → possible token theft → revoke ALL sessions
  if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
    user.refreshTokenHash = undefined;
    await user.save();
    throw new TokenReuseError();
  }

  // Issue new token pair (rotation)
  const newRefreshToken = signRefreshToken(userId);
  user.refreshTokenHash = sha256(newRefreshToken);
  await user.save();

  return {
    accessToken: signAccessToken(user.id as string, user.email),
    refreshToken: newRefreshToken,
  };
}

/**
 * Logout — invalidate the user's refresh token.
 */
export async function logout(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: '' } });
}

/**
 * Get user profile by ID.
 */
export async function getMe(userId: string): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) throw new InvalidCredentialsError();
  return user;
}

/**
 * Issue a JWT token pair for a user who has been authenticated via Google OAuth.
 * Called from the /auth/google/callback route after Passport validates the profile.
 */
export async function googleAuth(user: IUser): Promise<TokenPair> {
  const refreshToken = signRefreshToken(user.id as string);
  await User.findByIdAndUpdate(user.id, { refreshTokenHash: sha256(refreshToken) });

  return {
    accessToken: signAccessToken(user.id as string, user.email),
    refreshToken,
  };
}
