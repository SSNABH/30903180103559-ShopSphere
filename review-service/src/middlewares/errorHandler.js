export function errorHandler(error, req, res, next) {
  void req;
  void next;
  const statusCode = error.statusCode ?? 500;

  if (statusCode >= 500) console.error(error);

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'An unexpected server error occurred.' : error.message,
    code: error.code ?? (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
    ...(error.details && { details: error.details }),
  });
}

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} was not found.`,
    code: 'ROUTE_NOT_FOUND',
  });
}
