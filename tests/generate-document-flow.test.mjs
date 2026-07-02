import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/front-components/generate-document.front-component.tsx',
];

test('generate document record action component exists and is publicly exported', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'GenerateDocumentController',
    'createGenerateDocumentState',
    'renderGenerateDocumentModalMarkup',
    'filterDocumentHistory',
    'isGenerateDocumentActionVisible',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});

const {
  GenerateDocumentController,
  createGenerateDocumentState,
  filterDocumentHistory,
  isGenerateDocumentActionVisible,
  renderGenerateDocumentModalMarkup,
} = await import('../dist/front-components/generate-document.front-component.js');

const templates = [
  { id: 'template-1', name: 'Welcome Letter', isActive: true, status: 'ACTIVE', allowedOutputTypes: ['HTML', 'PDF'] },
  { id: 'template-2', name: 'Archived Letter', isActive: false, status: 'ARCHIVED', allowedOutputTypes: ['HTML'] },
];

const createApi = () => {
  const renders = [];
  const saves = [];
  const notifications = [];
  return {
    renders,
    saves,
    notifications,
    async listTemplates() {
      return templates;
    },
    async renderTemplate(input) {
      renders.push(input);
      if (input.templateId === 'bad-template') {
        return { ok: false, html: '', warnings: [], errors: [{ userMessage: 'Template render failed.' }] };
      }
      return {
        ok: true,
        html: `<h1>Generated for ${input.primaryObjectType} ${input.primaryRecordId}</h1>`,
        warnings: ['Rendered with CRM context'],
        errors: [],
        template: { id: input.templateId, name: 'Welcome Letter' },
      };
    },
    async saveDocument(input) {
      saves.push(input);
      return { ok: true, id: `generated-${saves.length}`, record: { id: `generated-${saves.length}`, ...input }, errors: [] };
    },
    notify(message) {
      notifications.push(message);
    },
  };
};

const recordContext = { primaryObjectType: 'person', primaryRecordId: 'person-1' };
const generatorPrincipal = { permissionScopes: ['generateDocuments', 'viewDocuments'] };
const viewerPrincipal = { permissionScopes: ['viewDocuments'] };

test('generate document action visibility requires generateDocuments permission and record context', () => {
  assert.equal(isGenerateDocumentActionVisible({ principal: generatorPrincipal, ...recordContext }), true);
  assert.equal(isGenerateDocumentActionVisible({ principal: viewerPrincipal, ...recordContext }), false);
  assert.equal(isGenerateDocumentActionVisible({ principal: generatorPrincipal, primaryObjectType: 'person' }), false);
  assert.equal(isGenerateDocumentActionVisible({ principal: undefined, ...recordContext }), false);
});

test('generate document modal renders template selector, preview pane, optional save, and live result region', () => {
  const state = createGenerateDocumentState({
    ...recordContext,
    templates,
    selectedTemplateId: 'template-1',
    previewHtml: '<h1>Hello Ada</h1>',
    shouldSave: true,
    statusMessage: 'Document generated and saved.',
  });
  const markup = renderGenerateDocumentModalMarkup(state);

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-label="Generate document"/);
  assert.match(markup, /<select[^>]*aria-label="Document template"/);
  assert.match(markup, /Welcome Letter/);
  assert.doesNotMatch(markup, /Archived Letter/, 'inactive templates should not be selectable');
  assert.match(markup, /aria-label="Rendered document preview"/);
  assert.match(markup, /Hello Ada/);
  assert.match(markup, /type="checkbox"[^>]*checked/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /Document generated and saved/);
});

test('generate document controller renders a single-record preview and saves generated history with notification', async () => {
  const api = createApi();
  const controller = new GenerateDocumentController({
    api,
    principal: generatorPrincipal,
    currentUser: { id: 'user-1' },
    initialState: createGenerateDocumentState({ ...recordContext }),
  });

  await controller.loadTemplates();
  assert.equal(controller.state.templates.length, 2);
  assert.equal(controller.state.selectedTemplateId, 'template-1');

  controller.selectTemplate('template-1');
  const generated = await controller.generate({ save: true });

  assert.equal(generated.ok, true);
  assert.equal(generated.documentId, 'generated-1');
  assert.equal(api.renders.length, 1);
  assert.deepEqual(api.renders[0], {
    templateId: 'template-1',
    primaryObjectType: 'person',
    primaryRecordId: 'person-1',
    principal: generatorPrincipal,
    currentUser: { id: 'user-1' },
  });
  assert.equal(api.saves.length, 1);
  assert.equal(api.saves[0].renderedHtml, '<h1>Generated for person person-1</h1>');
  assert.equal(api.saves[0].primaryRecordId, 'person-1');
  assert.equal(controller.state.previewHtml, '<h1>Generated for person person-1</h1>');
  assert.match(controller.state.statusMessage, /Document generated and saved/);
  assert.deepEqual(api.notifications, [{ type: 'success', message: 'Document generated and saved.' }]);
});

test('generate document controller supports preview-only generation and render errors', async () => {
  const api = createApi();
  const controller = new GenerateDocumentController({
    api,
    principal: generatorPrincipal,
    initialState: createGenerateDocumentState({ ...recordContext, templates: [{ id: 'bad-template', name: 'Bad Template', isActive: true }] }),
  });

  controller.selectTemplate('template-1');
  const previewOnly = await controller.generate({ save: false });
  assert.equal(previewOnly.ok, true);
  assert.equal(api.saves.length, 0, 'preview-only generation must not save history');
  assert.match(controller.state.statusMessage, /Document generated/);

  controller.selectTemplate('bad-template');
  const failed = await controller.generate({ save: true });
  assert.equal(failed.ok, false);
  assert.match(controller.state.errors.join('\n'), /Template render failed/);
  assert.deepEqual(api.notifications.at(-1), { type: 'error', message: 'Template render failed.' });
});

test('document history is filtered by primary object and record id in newest-first order', () => {
  const history = filterDocumentHistory({
    primaryObjectType: 'person',
    primaryRecordId: 'person-1',
    records: [
      { id: 'old', primaryObjectType: 'person', primaryRecordId: 'person-1', generatedAt: '2024-01-01T00:00:00.000Z', status: 'RENDERED' },
      { id: 'company', primaryObjectType: 'company', primaryRecordId: 'company-1', generatedAt: '2024-03-01T00:00:00.000Z', status: 'RENDERED' },
      { id: 'other-person', primaryObjectType: 'person', primaryRecordId: 'person-2', generatedAt: '2024-04-01T00:00:00.000Z', status: 'RENDERED' },
      { id: 'new', primaryObjectType: 'Person', primaryRecordId: 'person-1', generatedAt: '2024-02-01T00:00:00.000Z', status: 'PDF_GENERATED' },
    ],
  });

  assert.deepEqual(history.map((record) => record.id), ['new', 'old']);
});
