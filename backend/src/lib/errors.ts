/**
 * Custom error classes for Code Archaeologist
 */

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ExcavationError extends AppError {
  constructor(message: string) {
    super(`Excavation failed: ${message}`, 500);
  }
}

export class GeminiError extends AppError {
  constructor(message: string) {
    super(`AI analysis failed: ${message}`, 503);
  }
}

/**
 * Error handler middleware for Express
 */
export function errorHandler(err: Error, req: any, res: any, next: any) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  console.error('Unexpected error:', err);
  return res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
}

/**
 * Async wrapper to catch errors in route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
