import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir, platform } from 'node:os';
import path from 'node:path';
import { enginesVersion } from '@prisma/engines-version';

const environment = { ...process.env };

// Prisma 7 revalidates its shared Windows engine cache with `utime`.  Some
// normal-permission environments expose a readable shared cache but prohibit
// metadata writes.  Reuse the matching engine read-only when it is present;
// otherwise let Prisma download it normally for the current user.
if (platform() === 'win32' && !environment.PRISMA_SCHEMA_ENGINE_BINARY) {
  const appData = environment.APPDATA || path.join(homedir(), 'AppData', 'Roaming');
  const cachedEngine = path.join(appData, 'Prisma', 'master', enginesVersion, 'windows', 'schema-engine');
  if (existsSync(cachedEngine)) environment.PRISMA_SCHEMA_ENGINE_BINARY = cachedEngine;
}

const prismaCli = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  env: environment,
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
