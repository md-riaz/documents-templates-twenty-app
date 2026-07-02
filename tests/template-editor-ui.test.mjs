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
    'createTemplateEditorState',
    'renderTemplateEditorMarkup',
    'TemplateEditorController',
    'VariablePicker',
    'groupVariablesForPicker',
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
  mergeTemplateVariables,
  groupVariablesForPicker,
  fetchDocumentTemplate,
  createCoreTemplateEditorApi,
} = await import('../dist/front-components/template-editor.front-component.js');

test('mergeTemplateVariables de-duplicates by path, preferring already-referenced entries', () => {
  const referenced = [{ path: 'company.name', label: 'Company name (used)', isHelper: false }];
  const available = [
    { path: 'company.name', label: 'Company name (schema)', isHelper: false },
    { path: 'company.domainName', label: 'Domain', isHelper: false },
  ];

  const merged = mergeTemplateVariables(referenced, available);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((v) => v.path === 'company.name').label, 'Company name (used)');
  assert.ok(merged.find((v) => v.path === 'company.domainName'));
});

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
        html: `${input.htmlSource.replace('{{person.name.firstName}}', input.previewData.person.name.firstName)}`,
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
  htmlSource: '<h1>Hello {{person.name.firstName}}</h1>',
  previewData: { person: { name: { firstName: 'Ada' } } },
  variables: [{ path: 'person.name.firstName', label: 'First name', required: true }],
  allowedOutputTypes: ['HTML', 'PDF'],
  status: 'ACTIVE',
  isActive: true,
  version: 3,
};

test('renderTemplateEditorMarkup returns a preview placeholder', () => {
  const state = createTemplateEditorState({ template: fixtureTemplate });
  const markup = renderTemplateEditorMarkup(state);

  assert.match(markup, /aria-label="Template preview"/);
  assert.match(markup, /Loading preview/);
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
  createController.updateField('htmlSource', '<p>Hello</p>');
  createController.updateField('previewJson', '{}');
  const created = await createController.save();

  assert.equal(created.ok, true);
  assert.equal(api.savedTemplates.at(-1).version, 1);
});

test('template editor supports keyboard tab navigation and variable insertion', () => {
  let state = createTemplateEditorState({ template: fixtureTemplate });
  state = TemplateEditorController.reduceKey(state, { key: 'ArrowRight', target: 'tabs' });
  assert.equal(state.activeTab, 'preview');
  state = TemplateEditorController.reduceKey(state, { key: 'End', target: 'tabs' });
  assert.equal(state.activeTab, 'preview');
  state = TemplateEditorController.reduceKey(state, { key: 'Home', target: 'tabs' });
  assert.equal(state.activeTab, 'html');

  const inserted = insertVariableExpression('<p>Hello </p>', 'person.name.firstName', 9);
  assert.equal(inserted.value, '<p>Hello {{person.name.firstName}}</p>');
  assert.equal(inserted.cursor, '<p>Hello {{person.name.firstName}}'.length);

  const validation = validateTemplateEditorState({ ...state, name: '', htmlSource: '', previewJson: '{bad' });
  assert.match(validation.join('\n'), /Set a Name in the Fields tab before saving/);
  assert.match(validation.join('\n'), /HTML source is required/);
  assert.match(validation.join('\n'), /Preview JSON is not valid JSON/);
});

test('fetchDocumentTemplate maps a genql-queried record into TemplateEditorTemplate, coercing RAW_JSON fields', async () => {
  const fakeClient = {
    async query(request) {
      assert.ok(request.documentTemplate);
      assert.equal(request.documentTemplate.__args.filter.id.eq, 'template-9');
      return {
        documentTemplate: {
          id: 'template-9',
          name: 'Proposal',
          htmlSource: '<h1>{{company.name}}</h1>',
          previewData: '{"company":{"name":"Acme"}}',
          variables: '[]',
          boundObjectName: 'company',
          allowedOutputTypes: ['HTML', 'PDF'],
          status: 'ACTIVE',
          version: 2,
        },
      };
    },
  };

  const template = await fetchDocumentTemplate(fakeClient, 'template-9');
  assert.equal(template.id, 'template-9');
  assert.deepEqual(template.previewData, { company: { name: 'Acme' } });
  assert.deepEqual(template.variables, []);
  assert.equal(template.boundObjectName, 'company');
  assert.equal(template.version, 2);
});

test('fetchDocumentTemplate returns null for a missing record', async () => {
  const template = await fetchDocumentTemplate({ query: async () => ({ documentTemplate: null }) }, 'missing');
  assert.equal(template, null);
});

test('createCoreTemplateEditorApi renders previews locally, saves via updateDocumentTemplate/createDocumentTemplate, and validates boundObjectName against live metadata', async () => {
  const mutations = [];
  const fakeClient = {
    async mutation(request) {
      mutations.push(request);
      const field = Object.keys(request)[0];
      if (field === 'updateDocumentTemplate') {
        return { updateDocumentTemplate: { id: request.updateDocumentTemplate.__args.id, version: 5 } };
      }
      if (field === 'createDocumentTemplate') {
        return { createDocumentTemplate: { id: 'template-new', version: 1 } };
      }
      if (field === 'createTemplateVersion') {
        return { createTemplateVersion: { id: 'version-1' } };
      }
      throw new Error(`unexpected mutation field ${field}`);
    },
  };
  const fakeMetadataApi = {
    async listObjects() {
      return [{ nameSingular: 'company', labelSingular: 'Company', fields: [] }];
    },
    async getFields(objectNameSingular) {
      if (objectNameSingular !== 'company') return [];
      return [{ name: 'name', label: 'Name', type: 'TEXT', isRelation: false }];
    },
  };

  const api = createCoreTemplateEditorApi(fakeClient, fakeMetadataApi);

  const preview = await api.renderPreview({ htmlSource: '<h1>{{name}}</h1>', previewData: { name: 'Ada' } });
  assert.equal(preview.ok, true);
  assert.match(preview.html, /Ada/);
  assert.equal(mutations.length, 0, 'preview must be fully local, no network call');

  const updated = await api.saveTemplate({ id: 'template-9', name: 'Proposal', htmlSource: '<h1>x</h1>', status: 'ACTIVE' });
  assert.equal(updated.id, 'template-9');
  assert.equal(updated.version, 5);
  const updateData = mutations.find((m) => m.updateDocumentTemplate).updateDocumentTemplate.__args.data;
  assert.deepEqual(
    Object.keys(updateData).sort(),
    ['htmlSource', 'previewData', 'variables'],
    'updating an existing template must not touch name/boundObjectName/allowedOutputTypes/status — those are edited via the native Fields tab and would otherwise be clobbered with a stale value',
  );

  const created = await api.saveTemplate({ name: 'New', htmlSource: '<p>x</p>', status: 'ACTIVE' });
  assert.equal(created.id, 'template-new');
  const createData = mutations.find((m) => m.createDocumentTemplate).createDocumentTemplate.__args.data;
  assert.equal(createData.name, 'New', 'a brand-new record has no Fields-tab edit to clobber, so it still needs name seeded');
  assert.equal(createData.status, 'ACTIVE');

  const fields = await api.listFields('company');
  assert.deepEqual(fields, [{ path: 'company.name', label: 'company.name' }]);

  const validCheck = await api.validateBoundObjectName('company');
  assert.equal(validCheck.ok, true);
  const invalidCheck = await api.validateBoundObjectName('not-a-real-object');
  assert.equal(invalidCheck.ok, false);
  assert.match(invalidCheck.message, /not a valid Twenty object name/);
});

test('TemplateEditorController.save rejects an invalid boundObjectName before persisting', async () => {
  const saveTemplateCalls = [];
  const api = {
    async renderPreview() { return { ok: true, html: '', warnings: [], errors: [] }; },
    async saveTemplate(input) { saveTemplateCalls.push(input); return { ...input, id: 'template-1', version: 1 }; },
    async createTemplateVersion() { return {}; },
    async validateBoundObjectName(name) {
      return name === 'company' ? { ok: true } : { ok: false, message: `"${name}" is not a valid Twenty object name.` };
    },
  };
  const controller = new TemplateEditorController({
    initialState: createTemplateEditorState({ template: { ...fixtureTemplate, boundObjectName: 'not-real' } }),
    api,
    debounceMs: 1,
  });

  const result = await controller.save();
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /not a valid Twenty object name/);
  assert.equal(saveTemplateCalls.length, 0, 'save must not persist when boundObjectName is invalid');
});

test('groupVariablesForPicker groups variables by object prefix and marks referenced ones', () => {
  const available = [
    { path: 'opportunity.name', label: 'opportunity.name' },
    { path: 'opportunity.stage', label: 'opportunity.stage' },
    { path: 'opportunity.closeDate', label: 'opportunity.closeDate' },
    { path: 'opportunity.company.name', label: 'opportunity.company.name' },
    { path: 'opportunity.company.domainName', label: 'opportunity.company.domainName' },
    { path: 'opportunity.pointOfContact.name.firstName', label: 'opportunity.pointOfContact.name.firstName' },
  ];
  const referenced = new Set(['opportunity.name', 'opportunity.company.name']);

  const groups = groupVariablesForPicker(available, referenced);

  assert.ok(groups.length >= 2, 'should produce multiple groups');

  const oppGroup = groups.find((g) => g.label === 'opportunity');
  assert.ok(oppGroup, 'should have an "opportunity" group');
  assert.ok(oppGroup.variables.some((v) => v.path === 'opportunity.name' && v.referenced === true));
  assert.ok(oppGroup.variables.some((v) => v.path === 'opportunity.stage' && v.referenced === false));

  const companyGroup = groups.find((g) => g.label === 'opportunity.company');
  assert.ok(companyGroup, 'should have an "opportunity.company" group');
  assert.ok(companyGroup.variables.some((v) => v.path === 'opportunity.company.name' && v.referenced === true));
  assert.ok(companyGroup.variables.some((v) => v.path === 'opportunity.company.domainName' && v.referenced === false));
});

test('groupVariablesForPicker handles single-segment variables', () => {
  const available = [
    { path: 'today', label: 'today' },
    { path: 'company.name', label: 'company.name' },
  ];
  const groups = groupVariablesForPicker(available, new Set());
  assert.ok(groups.some((g) => g.label === 'today'), 'single-segment variable should create its own group');
  assert.ok(groups.some((g) => g.label === 'company'), 'dotted variable should group by prefix');
});
