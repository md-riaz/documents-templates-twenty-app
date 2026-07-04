import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/front-components/template-editor.front-component.tsx',
];

test('template editor front component exists and is publicly exported', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'templateEditorFrontComponent',
    'renderTemplateEditorMarkup',
    'TemplateEditorComponent',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});

const {
  renderTemplateEditorMarkup,
  createLocalPreviewTemplateEditorApi,
} = await import('../dist/front-components/template-editor.front-component.js');

test('renderTemplateEditorMarkup returns a preview placeholder', () => {
  const markup = renderTemplateEditorMarkup();
  assert.match(markup, /aria-label="Template preview"/);
  assert.match(markup, /Loading preview/);
});

test('createLocalPreviewTemplateEditorApi renders HTML through Handlebars', async () => {
  const api = createLocalPreviewTemplateEditorApi();
  const result = await api.renderPreview({
    htmlSource: '<h1>Hello {{name}}</h1>',
    previewData: { name: 'Ada' },
  });
  assert.equal(result.ok, true);
  assert.match(result.html, /Hello Ada/);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.errors, []);
});

test('createLocalPreviewTemplateEditorApi returns errors for invalid templates', async () => {
  const api = createLocalPreviewTemplateEditorApi();
  const result = await api.renderPreview({
    htmlSource: '<h1>{{#each}}{{/each></h1>',
    previewData: {},
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});
