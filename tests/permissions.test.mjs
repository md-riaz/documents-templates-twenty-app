import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const scopes = [
  'viewTemplates',
  'manageTemplates',
  'generateDocuments',
  'viewGeneratedDocs',
  'deleteGeneratedDocs',
];

test('application identity metadata is configured', () => {
  const constants = read('src/constants/universal-identifiers.ts');
  assert.match(constants, /Documents & Templates/);
  assert.match(constants, /Reusable document template management/);
  assert.match(constants, /MARKETPLACE/);
});

test('required permission scopes are declared and exported', () => {
  const permissionsPath = join(root, 'src/permissions/scopes.ts');
  assert.ok(existsSync(permissionsPath), 'src/permissions/scopes.ts should exist');
  const permissions = read('src/permissions/scopes.ts');
  for (const scope of scopes) assert.match(permissions, new RegExp(scope));
  assert.match(permissions, /DOCUMENTS_TEMPLATES_PERMISSION_SCOPES/);
});

test('shared permission guard utilities enforce missing scopes', () => {
  const guardPath = join(root, 'src/permissions/permission-guards.ts');
  assert.ok(existsSync(guardPath), 'permission guard utility should exist');
  const guard = read('src/permissions/permission-guards.ts');
  assert.match(guard, /hasPermissionScope/);
  assert.match(guard, /assertPermissionScope/);
  assert.match(guard, /PermissionDeniedError/);
  assert.match(guard, /throw new PermissionDeniedError/);
});
