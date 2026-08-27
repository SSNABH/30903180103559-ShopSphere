import { AppError } from '../utils/AppError.js';

function validate(schema, source, target) {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new AppError('Request validation failed.', 400, 'VALIDATION_ERROR', details));
    }
    req[target] = result.data;
    return next();
  };
}

export const validateBody = (schema) => validate(schema, 'body', 'validatedBody');
export const validateQuery = (schema) => validate(schema, 'query', 'validatedQuery');
