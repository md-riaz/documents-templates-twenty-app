import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

test('Twenty app baseline declares required package identity and scripts', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.name, 'documents-templates');
  assert.equal(pkg.packageManager, 'yarn@4.9.2');
  assert.match(pkg.engines.node, /24|>=24/);
  assert.equal(pkg.scripts.twenty, 'twenty');
  assert.match(pkg.scripts.build, /twenty dev:build/);
  assert.match(pkg.scripts.typecheck, /twenty dev:typecheck/);
});

test('application manifest exports baseline config entities', () => {
  const indexPath = join(root, 'src/index.ts');
  assert.ok(existsSync(indexPath), 'src/index.ts should exist');
  const index = read('src/index.ts');
  assert.match(index, /applicationConfig/);
  assert.match(index, /defaultRole/);
});
