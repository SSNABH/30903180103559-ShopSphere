import 'dotenv/config';
import { z } from 'zod';

// The review service owns reviews and nothing else. It holds no Postgres
// credential and no JWT secret: product lookups and caller identity are both
// resolved by asking the main ShopSphere API, which remains the authority for
// both. That keeps the number of services holding secrets to one.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5100),
  MONGODB_URI: z.string().min(1),
  SHOPSPHERE_API_URL: z.string().url(),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = Object.freeze(result.data);
