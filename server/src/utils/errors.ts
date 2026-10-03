// ─── Base Application Error ───────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, string>;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Specific Error Types ─────────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(details: Record<string, string>) {
    super(400, 'VALIDATION_ERROR', 'Validation failed', details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class InvalidRefreshTokenError extends AppError {
  constructor() {
    super(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
    this.name = 'InvalidRefreshTokenError';
  }
}

export class TokenReuseError extends AppError {
  constructor() {
    super(401, 'TOKEN_REUSE_DETECTED', 'Token reuse detected. All sessions have been revoked.');
    this.name = 'TokenReuseError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super(429, 'RATE_LIMITED', 'Too many requests. Please try again later.');
    this.name = 'RateLimitError';
  }
}

export class LLMUnavailableError extends AppError {
  constructor() {
    super(503, 'LLM_UNAVAILABLE', 'AI service temporarily unavailable. Please try again.');
    this.name = 'LLMUnavailableError';
  }
}
