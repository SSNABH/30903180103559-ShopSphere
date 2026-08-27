#!/bin/sh
set -e

node --experimental-strip-types scripts/apply-migrations.js
if [ "${SEED_DATABASE:-true}" = "true" ]; then
  node --experimental-strip-types prisma/seed.js
fi
node --experimental-strip-types src/server.js
