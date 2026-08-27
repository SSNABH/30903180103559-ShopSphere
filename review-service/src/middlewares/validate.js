import { AppError } from '../utils/AppError.js';

function formatIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));
}

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new AppError('The submitted data is invalid.', 422, 'VALIDATION_ERROR', formatIssues(result.error)),
      );
    }
    req.validatedBody = result.data;
    return next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(
        new AppError('The query parameters are invalid.', 422, 'VALIDATION_ERROR', formatIssues(result.error)),
      );
    }
    req.validatedQuery = result.data;
    return next();
  };
}
