import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/front-components/template-editor.front-component.ts',
];

test('template editor front component exists and is publicly exported', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'templateEditorFrontComponent',
    'createTemplateEditorState',
    'renderTemplateEditorMarkup',
    'TemplateEditorController',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});

const {
  createTemplateEditorState,
  TemplateEditorController,
  renderTemplateEditorMarkup,
  validateTemplateEditorState,
  insertVariableExpression,
} = await import('../dist/front-components/template-editor.front-component.js');

const createApi = () => {
  const savedTemplates = [];
  const versions = [];
  const previews = [];
  return {
    savedTemplates,
    versions,
    previews,
    async renderPreview(input) {
      previews.push(input);
      if (input.htmlSource.includes('{{missing')) {
        return { ok: false, html: '', warnings: [], errors: [{ userMessage: 'Missing required variable: missing.name' }] };
      }
      return {
        ok: true,
        html: `<style>${input.cssSource}</style>${input.htmlSource.replace('{{person.name.firstName}}', input.previewData.person.name.firstName)}`,
        warnings: input.previewData.warning ? ['Fixture warning'] : [],
        errors: [],
      };
    },
    async saveTemplate(input) {
      const id = input.id ?? `template-${savedTemplates.length + 1}`;
      const record = { ...input, id, version: input.version ?? 1 };
      savedTemplates.push(record);
      return record;
    },
    async createTemplateVersion(input) {
      const record = { id: `version-${versions.length + 1}`, ...input };
      versions.push(record);
      return record;
    },
  };
};

const fixtureTemplate = {
  id: 'template-1',
  name: 'Welcome Letter',
  slug: 'welcome-letter',
  htmlSource: '<h1>Hello {{person.name.firstName}}</h1>',
  cssSource: 'h1 { color: purple; }',
  previewData: { person: { name: { firstName: 'Ada' } } },
  variables: [{ path: 'person.name.firstName', label: 'First name', required: true }],
  renderer: 'HANDLEBARS',
  defaultSubject: 'Welcome {{person.name.firstName}}',
  provider: 'person',
  allowedOutputTypes: ['HTML', 'PDF'],
  status: 'ACTIVE',
  isActive: true,
  version: 3,
};

test('template editor renders accessible HTML/CSS/preview/settings tabs and variable browser', () => {
  const state = createTemplateEditorState({ template: fixtureTemplate });
  const markup = renderTemplateEditorMarkup(state);

  assert.match(markup, /role="tablist"/);
  assert.match(markup, /aria-label="Template editor tabs"/);
  for (const tab of ['HTML', 'CSS', 'Preview JSON', 'Settings']) {
    assert.match(markup, new RegExp(`role="tab"[^>]*>${tab}`));
  }
  assert.match(markup, /aria-label="HTML template source"/);
  assert.match(markup, /aria-label="CSS template source"/);
  assert.match(markup, /aria-label="Preview JSON data"/);
  assert.match(markup, /role="listbox"[^>]*aria-label="Available template variables"/);
  assert.match(markup, /data-variable="person\.name\.firstName"/);
  assert.match(markup, /aria-live="polite"/);
});

test('template editor debounces live preview and updates preview result', async () => {
  const api = createApi();
  const controller = new TemplateEditorController({
    initialState: createTemplateEditorState({ template: fixtureTemplate }),
    api,
    debounceMs: 15,
  });

  controller.updateField('htmlSource', '<h1>Hello {{person.name.firstName}}</h1><p>Draft A</p>');
  controller.updateField('htmlSource', '<h1>Hello {{person.name.firstName}}</h1><p>Draft B</p>');

  await controller.flushPreview();

  assert.equal(api.previews.length, 1, 'rapid edits should coalesce into one preview request');
  assert.match(controller.state.previewHtml, /Draft B/);
  assert.match(controller.state.previewHtml, /Ada/);
  assert.deepEqual(controller.state.validationErrors, []);
});

test('template editor validates preview JSON and surfaces render validation errors', async () => {
  const api = createApi();
  const controller = new TemplateEditorController({
    initialState: createTemplateEditorState({ template: fixtureTemplate }),
    api,
    debounceMs: 1,
  });

  controller.updateField('previewJson', '{ not valid json');
  await controller.flushPreview();
  assert.match(controller.state.validationErrors.join('\n'), /Preview JSON is not valid JSON/);
  assert.equal(api.previews.length, 0, 'invalid preview JSON should not call preview API');

  controller.updateField('previewJson', JSON.stringify(fixtureTemplate.previewData));
  controller.updateField('htmlSource', '<p>{{missing.name}}</p>');
  await controller.flushPreview();
  assert.match(controller.state.validationErrors.join('\n'), /Missing required variable/);
});

test('template editor save creates or updates templates and records versions when source changes', async () => {
  const api = createApi();
  const controller = new TemplateEditorController({
    initialState: createTemplateEditorState({ template: fixtureTemplate }),
    api,
    debounceMs: 1,
  });

  controller.updateField('htmlSource', '<h1>Hello {{person.name.firstName}}</h1><p>Changed</p>');
  const saved = await controller.save();

  assert.equal(saved.ok, true);
  assert.equal(api.savedTemplates.length, 1);
  assert.equal(api.savedTemplates[0].version, 4);
  assert.equal(api.versions.length, 1, 'source changes should create a TemplateVersion');
  assert.equal(api.versions[0].templateId, 'template-1');
  assert.equal(api.versions[0].versionNumber, 4);
  assert.match(controller.state.statusMessage, /Saved version 4/);

  const createController = new TemplateEditorController({
    initialState: createTemplateEditorState(),
    api,
    debounceMs: 1,
  });
  createController.updateField('name', 'New Template');
  createController.updateField('slug', 'new-template');
  createController.updateField('htmlSource', '<p>Hello</p>');
  createController.updateField('previewJson', '{}');
  const created = await createController.save();

  assert.equal(created.ok, true);
  assert.equal(api.savedTemplates.at(-1).version, 1);
});

test('template editor supports keyboard tab navigation and variable insertion', () => {
  let state = createTemplateEditorState({ template: fixtureTemplate });
  state = TemplateEditorController.reduceKey(state, { key: 'ArrowRight', target: 'tabs' });
  assert.equal(state.activeTab, 'css');
  state = TemplateEditorController.reduceKey(state, { key: 'End', target: 'tabs' });
  assert.equal(state.activeTab, 'settings');
  state = TemplateEditorController.reduceKey(state, { key: 'Home', target: 'tabs' });
  assert.equal(state.activeTab, 'html');

  const inserted = insertVariableExpression('<p>Hello </p>', 'person.name.firstName', 9);
  assert.equal(inserted.value, '<p>Hello {{person.name.firstName}}</p>');
  assert.equal(inserted.cursor, '<p>Hello {{person.name.firstName}}'.length);

  const validation = validateTemplateEditorState({ ...state, name: '', htmlSource: '', previewJson: '{bad' });
  assert.match(validation.join('\n'), /Template name is required/);
  assert.match(validation.join('\n'), /HTML source is required/);
  assert.match(validation.join('\n'), /Preview JSON is not valid JSON/);
});
