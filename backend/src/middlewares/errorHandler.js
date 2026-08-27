import { logger } from '../config/logger.js';

export function errorHandler(error, req, res, next) {
  void next;
  const statusCode = error.statusCode ?? 500;

  // Error entries carry the same timestamp and severity as request entries, so
  // a failure and the request that caused it line up in one stream. A 5xx is
  // ours and logged with its stack; a 4xx is the caller's and logged at warn
  // without one, because the stack says nothing useful about a bad password.
  const entry = {
    code: error.code ?? (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
    statusCode,
    method: req.method,
    url: req.originalUrl,
  };

  if (statusCode >= 500) {
    logger.error({ ...entry, err: error }, `Unhandled error: ${error.message}`);
  } else {
    logger.warn(entry, `Request rejected: ${error.message}`);
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'An unexpected server error occurred.' : error.message,
    code: entry.code,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}
