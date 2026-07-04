import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const objectFiles = [
  ['src/objects/document-template.object.ts', 'DocumentTemplate'],
  ['src/objects/template-version.object.ts', 'TemplateVersion'],
  ['src/objects/document.object.ts', 'Document'],
];

test('custom objects and relations are defined for document lifecycle records', () => {
  for (const [path, label] of objectFiles) {
    assert.ok(existsSync(join(root, path)), `${label} object file should exist`);
    const source = read(path);
    assert.match(source, /defineObject/);
    assert.match(source, new RegExp(label));
  }

  const template = read('src/objects/document-template.object.ts');
  for (const field of ['htmlSource', 'previewData', 'boundObjectName', 'status', 'version']) {
    assert.match(template, new RegExp(field), `DocumentTemplate should define ${field}`);
  }
  assert.match(template, /TemplateVersion/);
  assert.match(template, /DOCUMENT_OBJECT_UNIVERSAL_IDENTIFIER/, 'DocumentTemplate should reference the Document object it relates to');

  const document = read('src/objects/document.object.ts');
  for (const field of ['primaryObjectType', 'primaryRecordId', 'renderedHtml', 'pdfUrl', 'status', 'generatedAt']) {
    assert.match(document, new RegExp(field), `Document should define ${field}`);
  }
});

test('navigation saved views command menu and page tab shells are registered', () => {
  for (const path of [
    'src/menu/document-template.view.ts',
    'src/menu/document.view.ts',
    'src/menu/documents-templates.navigation-menu-item.ts',
    'src/menu/documents-templates-folder.navigation-menu-item.ts',
    'src/menu/documents.navigation-menu-item.ts',
    'src/page-layout-tabs/documents-standard-record-tabs.ts',
    'src/page-layout-tabs/document-template-fields.page-layout-tab.ts',
    'src/page-layout-tabs/document-template-editor.page-layout-tab.ts',
  ]) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'documentTemplateObject',
    'templateVersionObject',
    'documentObject',
    'documentTemplateView',
    'documentView',
    'documentsNavigationMenuItem',
    'documentsTemplatesNavigationFolder',
    'documentsTemplatesNavigationMenuItem',
    'companyDocumentsPageLayoutTab',
    'personDocumentsPageLayoutTab',
    'documentTemplateFieldsTab',
    'documentTemplateEditorTab',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});

test('DocumentTemplate has Fields tab (position 0) with HTML Source editor widget, and Preview tab (position 1)', () => {
  const fieldsTab = read('src/page-layout-tabs/document-template-fields.page-layout-tab.ts');
  assert.match(fieldsTab, /title: 'Fields'/);
  assert.match(fieldsTab, /position: 0/);
  assert.match(fieldsTab, /type: 'FIELDS'/);
  assert.match(fieldsTab, /type: 'FIELD'/);
  assert.match(fieldsTab, /fieldDisplayMode: 'EDITOR'/);
  assert.match(fieldsTab, /htmlSource/);

  const previewTab = read('src/page-layout-tabs/document-template-editor.page-layout-tab.ts');
  assert.match(previewTab, /title: 'Preview'/);
  assert.match(previewTab, /position: 1/);
  assert.match(previewTab, /type: 'FRONT_COMPONENT'/);
});

test('navigation folder groups Documents and Templates items', () => {
  const folder = read('src/menu/documents-templates-folder.navigation-menu-item.ts');
  assert.match(folder, /NavigationMenuItemType\.FOLDER/);
  assert.match(folder, /name: 'Documents & Templates'/);

  const documents = read('src/menu/documents.navigation-menu-item.ts');
  assert.match(documents, /name: 'Documents'/);
  assert.match(documents, /folderUniversalIdentifier: DOCUMENTS_TEMPLATES_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIER/);

  const templates = read('src/menu/documents-templates.navigation-menu-item.ts');
  assert.match(templates, /name: 'Templates'/);
  assert.match(templates, /folderUniversalIdentifier: DOCUMENTS_TEMPLATES_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIER/);
});
