import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const roots = ['src', 'tests', 'scripts'];
const files = [];

function collect(directory) {
  for (const entry of readdirSync(directory)) {
    const target = path.join(directory, entry);
    const stats = statSync(target);
    if (stats.isDirectory()) {
      if (target.includes(`${path.sep}generated${path.sep}`) || target.endsWith(`${path.sep}generated`)) continue;
      collect(target);
    } else if (target.endsWith('.js')) {
      files.push(target);
    }
  }
}

for (const root of roots) collect(root);
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Syntax check passed for ${files.length} JavaScript files.`);
