import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const exists = (path) => existsSync(join(root, path));

const requiredDocs = [
  ['README.md', ['Documents & Templates', 'User guide', 'Quick start', 'Marketplace readiness']],
  ['docs/admin-guide.md', ['Admin guide', 'Permissions', 'Configuration', 'Release checklist']],
  ['docs/workflow-examples.md', ['Workflow examples', 'Render Template', 'Generate PDF', 'Send Templated Email', 'BulkIterator']],
  ['docs/release-notes.md', ['Release notes', '0.1.0', 'Known limitations', 'Verification']],
  ['docs/ci-commands.md', ['CI commands', 'typescript', 'npm test', 'twenty dev --once --dry-run']],
];

test('release documentation set exists with marketplace-ready user, admin, workflow, release, and CI content', () => {
  for (const [path, phrases] of requiredDocs) {
    assert.ok(exists(path), `${path} should exist`);
    const content = read(path);
    for (const phrase of phrases) {
      assert.match(content, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${path} should mention ${phrase}`);
    }
  }
});

test('screenshot placeholders cover core marketplace flows and are referenced by README', () => {
  const screenshotDir = join(root, 'docs', 'screenshots');
  assert.ok(existsSync(screenshotDir), 'docs/screenshots should exist');
  const screenshots = readdirSync(screenshotDir).filter((file) => file.endsWith('.md')).sort();
  assert.deepEqual(screenshots, [
    '01-template-library.md',
    '02-template-editor.md',
    '03-generate-document-modal.md',
    '04-send-email-modal.md',
    '05-workflow-builder.md',
  ]);
  const readme = read('README.md');
  for (const screenshot of screenshots) {
    assert.match(readme, new RegExp(`docs/screenshots/${screenshot}`), `README should reference ${screenshot}`);
  }
});

test('GitHub Actions workflow runs the documented release verification commands', () => {
  assert.ok(exists('.github/workflows/release-artifacts.yml'), 'release CI workflow should exist');
  const workflow = read('.github/workflows/release-artifacts.yml');
  assert.match(workflow, /node-version:\s*['"]?24/);
  assert.match(workflow, /node \.\/node_modules\/typescript\/bin\/tsc --outDir dist --rootDir src --module NodeNext --moduleResolution NodeNext --target ES2022 --jsx react-jsx --skipLibCheck/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /yarn twenty dev --once --dry-run/);
});
