import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const required = [
  'frontend/',
  'backend/',
  'frontend/Dockerfile',
  'backend/Dockerfile',
  'docker-compose.yml',
  '.env.example',
  'frontend/.env.example',
  'backend/.env.example',
  'README.txt',
  'README.md',
  'backend/tests/jest/unit/review-service.test.js',
  'backend/tests/jest/integration/commerce.supertest.test.js',
  'frontend/src/contexts/AuthProvider.test.jsx',
  'frontend/src/pages/__tests__/AdminCatalogPage.test.jsx',
  'frontend/src/pages/__tests__/AdminUsersPage.test.jsx',
  'frontend/src/pages/__tests__/CartPage.test.jsx',
  'frontend/src/lib/commerce.test.js',
];

for (const path of required) {
  if (!existsSync(path)) throw new Error(`Required delivery item is missing: ${path}`);
}

const compose = readFileSync('docker-compose.yml', 'utf8');
for (const service of ['frontend', 'backend', 'postgres', 'mongodb', 'mailpit']) {
  if (!new RegExp(`^  ${service}:`, 'm').test(compose)) {
    throw new Error(`Docker Compose service is missing: ${service}`);
  }
}
for (const volume of ['postgres_data', 'mongo_data', 'uploads_data']) {
  if (!compose.includes(volume)) throw new Error(`Persistent Docker volume is missing: ${volume}`);
}


if (/axllent\/mailpit:latest/.test(compose) || !/axllent\/mailpit:v\d+\.\d+\.\d+/.test(compose)) {
  throw new Error('Mailpit must use a pinned semantic-version image tag.');
}

for (const lockfile of ['backend/package-lock.json', 'frontend/package-lock.json']) {
  JSON.parse(readFileSync(lockfile, 'utf8'));
}

const backendPackage = JSON.parse(readFileSync('backend/package.json', 'utf8'));
const frontendPackage = JSON.parse(readFileSync('frontend/package.json', 'utf8'));
for (const dependency of ['jest', 'supertest']) {
  if (!backendPackage.devDependencies?.[dependency]) throw new Error(`Backend test dependency is missing: ${dependency}`);
}
for (const dependency of ['@testing-library/react', 'msw', 'vitest']) {
  if (!frontendPackage.devDependencies?.[dependency]) throw new Error(`Frontend test dependency is missing: ${dependency}`);
}

const readme = readFileSync('README.txt', 'utf8');
for (const section of ['PROJECT SUMMARY', 'TECHNOLOGIES USED', 'DOCKER QUICK START', 'PROJECT URLS', 'TEST ACCOUNTS', 'IMPORTANT NOTES']) {
  if (!readme.includes(section)) throw new Error(`README.txt section is missing: ${section}`);
}
if (!readme.includes('fullstack-ecommerce-shady-sameh')) {
  throw new Error('README.txt does not contain the finalized repository name.');
}
if (!readme.includes('Readiness Check: http://localhost:5000/api/health/ready')) {
  throw new Error('README.txt does not list the readiness endpoint.');
}
if (!readme.includes('public and accessible without signing in')) {
  throw new Error('README.txt does not require public repository access.');
}
if (readme.includes('[your-full-name]')) {
  throw new Error('README.txt still contains an unresolved repository-name placeholder.');
}

let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\n')
    .filter(Boolean);
} catch {
  console.log('Git metadata is not present; tracked-file hygiene check skipped for this exported copy.');
}

const forbidden = tracked.filter((file) => (
  file === '.env' ||
  file.endsWith('/.env') ||
  file.includes('node_modules/') ||
  file.startsWith('frontend/dist/') ||
  file.startsWith('backend/uploads/') && !file.endsWith('.gitkeep') ||
  file.includes('/coverage/')
));
if (forbidden.length) throw new Error(`Forbidden generated or secret files are tracked: ${forbidden.join(', ')}`);

console.log('Delivery structure verification passed.');
