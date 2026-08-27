import 'dotenv/config';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  MONGODB_URI: z.string().min(1),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  // Reviews were extracted into an independently deployed service. The admin
  // statistics endpoint asks it for the review count over REST.
  REVIEW_SERVICE_URL: z.string().url().default('http://localhost:5100'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: booleanString,
  SMTP_FROM: z.string().default('DECI.Project <no-reply@deci-project.local>'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  DATABASE_CONNECTION_REQUIRED: booleanString.default('true'),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = Object.freeze(result.data);
