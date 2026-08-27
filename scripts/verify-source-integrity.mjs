import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const pass = (condition, message) => { if (!condition) failures.push(message); };
const read = (file) => readFileSync(path.join(root, file), 'utf8');

function collect(directory, extensions, output = []) {
  for (const entry of readdirSync(path.join(root, directory))) {
    const relative = path.join(directory, entry);
    const full = path.join(root, relative);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'coverage'].includes(entry)) continue;
      collect(relative, extensions, output);
    } else if (extensions.some((extension) => relative.endsWith(extension))) {
      output.push(relative);
    }
  }
  return output;
}

function resolvesImport(sourceFile, specifier) {
  const base = path.resolve(root, path.dirname(sourceFile), specifier);
  const candidates = [base, `${base}.js`, `${base}.jsx`, `${base}.json`, path.join(base, 'index.js'), path.join(base, 'index.jsx')];
  return candidates.some(existsSync);
}

for (const sourceFile of collect('frontend/src', ['.js', '.jsx']).concat(collect('backend', ['.js']))) {
  const source = read(sourceFile);
  const importPattern = /(?:import\s+(?:[^'\"]+?\s+from\s+)?|export\s+[^'\"]*?from\s+|import\()(['\"])(\.\.?\/[^'\"]+)\1/g;
  for (const match of source.matchAll(importPattern)) {
    pass(resolvesImport(sourceFile, match[2]), `Broken relative import in ${sourceFile}: ${match[2]}`);
  }
}

for (const npmrc of ['.npmrc', 'backend/.npmrc', 'frontend/.npmrc']) {
  const npmConfig = read(npmrc);
  pass(npmConfig.includes('registry=https://registry.npmjs.org/'), `${npmrc} does not select the public npm registry`);
}

for (const area of ['backend', 'frontend']) {
  const manifest = JSON.parse(read(`${area}/package.json`));
  const lock = JSON.parse(read(`${area}/package-lock.json`));
  const rootPackage = lock.packages?.[''] ?? {};
  pass(JSON.stringify(rootPackage.dependencies ?? {}) === JSON.stringify(manifest.dependencies ?? {}), `${area} lockfile dependency declarations differ from package.json`);
  pass(JSON.stringify(rootPackage.devDependencies ?? {}) === JSON.stringify(manifest.devDependencies ?? {}), `${area} lockfile devDependency declarations differ from package.json`);
}

const apiSource = read('frontend/src/lib/api.js');
pass(!apiSource.includes("headers: { 'Content-Type': 'application/json' }"), 'Axios still forces JSON content type globally');
pass(read('frontend/src/lib/commerce.test.js').includes('multipart\\/form-data') && read('frontend/src/lib/commerce.test.js').includes('boundary='), 'Multipart upload regression test is missing');
pass(read('backend/src/services/reviewService.js').includes('isValidObjectId'), 'Review ID validation is missing');
pass(read('frontend/src/pages/AdminCatalogPage.jsx').includes('imageUploadPartialSuccess'), 'Partial image-upload success handling is missing');
pass(read('frontend/src/pages/CartPage.jsx').includes('increaseQuantity'), 'Cart stock-boundary controls are missing');

const compose = read('docker-compose.yml');
pass(/mailpit:\s*[\s\S]*?image:\s*axllent\/mailpit:v\d+\.\d+\.\d+/m.test(compose), 'Mailpit image is not pinned to an exact version');
pass(!/axllent\/mailpit:latest/.test(compose), 'Mailpit still uses latest');

const testFiles = collect('backend/tests', ['.js']).concat(collect('frontend/src', ['.test.js', '.test.jsx']));
let testDeclarations = 0;
for (const file of testFiles) {
  const source = read(file);
  testDeclarations += [...source.matchAll(/\b(?:test|it)\s*\(/g)].length;
  pass(!/\b(?:test|it|describe)\.(?:only|skip)\s*\(/.test(source), `Focused or skipped test found in ${file}`);
}
pass(testDeclarations >= 45, `Expected at least 45 automated test declarations, found ${testDeclarations}`);

const readme = read('README.txt');
pass(readme.includes('Readiness Check: http://localhost:5000/api/health/ready'), 'README.txt readiness URL is missing');
pass(readme.includes('public and accessible without signing in'), 'README.txt public repository requirement is missing');
pass(!/private repository|granted access/i.test(`${readme}\n${read('README.md')}`), 'Submission documentation still permits a private repository');

if (failures.length) {
  console.error('Source-integrity verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Source-integrity verification passed (${testDeclarations} test declarations across ${testFiles.length} test files).`);
