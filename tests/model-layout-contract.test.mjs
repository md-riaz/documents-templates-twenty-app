import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const objectFiles = [
  ['src/objects/document-template.object.ts', 'DocumentTemplate'],
  ['src/objects/template-category.object.ts', 'TemplateCategory'],
  ['src/objects/template-version.object.ts', 'TemplateVersion'],
  ['src/objects/generated-document.object.ts', 'GeneratedDocument'],
];

test('custom objects and relations are defined for document lifecycle records', () => {
  for (const [path, label] of objectFiles) {
    assert.ok(existsSync(join(root, path)), `${label} object file should exist`);
    const source = read(path);
    assert.match(source, /defineObject/);
    assert.match(source, new RegExp(label));
  }

  const template = read('src/objects/document-template.object.ts');
  for (const field of ['htmlSource', 'cssSource', 'previewData', 'variables', 'renderer', 'defaultSubject', 'isActive', 'version']) {
    assert.match(template, new RegExp(field), `DocumentTemplate should define ${field}`);
  }
  assert.match(template, /TemplateCategory/);
  assert.match(template, /TemplateVersion/);
  assert.match(template, /GeneratedDocument/);

  const generated = read('src/objects/generated-document.object.ts');
  for (const field of ['primaryObjectType', 'primaryRecordId', 'renderedHtml', 'pdfUrl', 'emailSentAt', 'status', 'generatedAt']) {
    assert.match(generated, new RegExp(field), `GeneratedDocument should define ${field}`);
  }
});

test('navigation saved views command menu and page tab shells are registered', () => {
  for (const path of [
    'src/views/document-template.view.ts',
    'src/views/generated-document.view.ts',
    'src/navigation-menu-items/documents-templates.navigation-menu-item.ts',
    'src/navigation-menu-items/generated-documents.navigation-menu-item.ts',
    'src/command-menu-items/open-template-management.command-menu-item.ts',
    'src/command-menu-items/generate-document.command-menu-item.ts',
    'src/page-layout-tabs/documents-standard-record-tabs.ts',
    'src/front-components/document-shell.front-component.tsx',
  ]) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'documentTemplateObject',
    'templateCategoryObject',
    'templateVersionObject',
    'generatedDocumentObject',
    'documentTemplateView',
    'generatedDocumentView',
    'documentsTemplatesNavigationMenuItem',
    'generatedDocumentsNavigationMenuItem',
    'openTemplateManagementCommandMenuItem',
    'generateDocumentCommandMenuItem',
    'companyDocumentsPageLayoutTab',
    'personDocumentsPageLayoutTab',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});
