import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/logic/render-template.ts',
  'src/logic/save-generated-document.ts',
];

test('render/save logic function modules exist and are publicly exported', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'renderTemplateLogic',
    'saveGeneratedDocumentLogic',
    'RenderTemplateLogicInput',
    'SaveGeneratedDocumentInput',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});

const { PermissionDeniedError } = await import('../dist/permissions/permission-guards.js');
const { createContextProviderRegistry } = await import('../dist/logic/context/provider-registry.js');
const { renderTemplateLogic } = await import('../dist/logic/render-template.js');
const { saveGeneratedDocumentLogic } = await import('../dist/logic/save-generated-document.js');

const createFixtureApi = () => {
  const created = [];
  return {
    created,
    async getRecord(objectName, id) {
      if (objectName === 'documentTemplate' && id === 'template-1') {
        return {
          id,
          name: 'Welcome Letter',
          isActive: true,
          status: 'ACTIVE',
          htmlSource: '<h1>Hello {{person.name.firstName}}</h1><p>{{uppercase company.name}}</p>',
          cssSource: 'h1 { color: rebeccapurple; }',
          renderer: 'HANDLEBARS',
        };
      }
      if (objectName === 'documentTemplate' && id === 'inactive-template') {
        return { id, name: 'Inactive', isActive: false, status: 'ARCHIVED', htmlSource: 'Nope' };
      }
      if (objectName === 'documentTemplate' && id === 'bound-template') {
        return {
          id,
          name: 'Opportunity Brief',
          isActive: true,
          status: 'ACTIVE',
          renderer: 'HANDLEBARS',
          boundObjectName: 'opportunity',
          htmlSource: '<h1>{{opportunity.name}}</h1>',
        };
      }
      if (objectName === 'person' && id === 'person-1') {
        return { id, name: { firstName: 'Ada', lastName: 'Lovelace' }, companyId: 'company-1' };
      }
      if (objectName === 'opportunity' && id === 'op-1') {
        return { id, name: 'Big Deal' };
      }
      return null;
    },
    async createRecord(objectName, data) {
      assert.equal(objectName, 'generatedDocument');
      const record = { id: `generated-${created.length + 1}`, ...data };
      created.push(record);
      return record;
    },
  };
};

const generatorPrincipal = { permissionScopes: ['generateDocuments'] };
const viewerPrincipal = { permissionScopes: ['viewTemplates'] };

test('renderTemplateLogic loads template, context, renders HTML/CSS and warning responses', async () => {
  const api = createFixtureApi();
  const registry = createContextProviderRegistry({
    providers: {
      person: async ({ api, primaryRecordId }) => ({
        context: {
          person: await api.getRecord('person', primaryRecordId),
          company: { name: 'Analytical Engines Ltd' },
          primary: { objectType: 'person', record: { id: primaryRecordId } },
        },
        warnings: ['Company relation loaded from fixture'],
      }),
    },
  });

  const output = await renderTemplateLogic({
    templateId: 'template-1',
    primaryObjectType: 'Person',
    primaryRecordId: 'person-1',
    principal: generatorPrincipal,
    api,
    registry,
  });

  assert.equal(output.ok, true);
  assert.match(output.html, /<style>h1 \{ color: rebeccapurple; \}<\/style>/);
  assert.match(output.html, /Hello Ada/);
  assert.match(output.html, /ANALYTICAL ENGINES LTD/);
  assert.equal(output.context.person.name.firstName, 'Ada');
  assert.deepEqual(output.errors, []);
  assert.match(output.warnings.join('\n'), /Company relation loaded from fixture/);
  assert.equal(output.template.id, 'template-1');
});

test('renderTemplateLogic uses template.boundObjectName as the object type, overriding input.primaryObjectType', async () => {
  const api = createFixtureApi();
  const output = await renderTemplateLogic({
    templateId: 'bound-template',
    // Caller passes 'person', but the saved template is bound to 'opportunity';
    // boundObjectName must win (this is the corrected, sentinel-free behavior).
    primaryObjectType: 'person',
    primaryRecordId: 'op-1',
    principal: generatorPrincipal,
    api,
  });

  assert.equal(output.ok, true);
  assert.match(output.html, /Big Deal/);
  assert.equal(output.context.opportunity.name, 'Big Deal');
  assert.equal('person' in output.context, false, 'bound object should override the ad-hoc primaryObjectType');
});

test('renderTemplateLogic loads context for a bound template given only primaryRecordId (no primaryObjectType at all)', async () => {
  const api = createFixtureApi();
  const output = await renderTemplateLogic({
    templateId: 'bound-template',
    // This is the primary motivating use case for boundObjectName: the caller
    // only has a record id, and relies entirely on the template's own binding
    // to resolve the object type. Must NOT be rejected for lacking primaryObjectType.
    primaryRecordId: 'op-1',
    principal: generatorPrincipal,
    api,
  });

  assert.equal(output.ok, true);
  assert.match(output.html, /Big Deal/);
  assert.equal(output.context.opportunity.name, 'Big Deal');
});

test('renderTemplateLogic supports previewData with viewTemplates permission only', async () => {
  const api = createFixtureApi();
  const output = await renderTemplateLogic({
    templateId: 'template-1',
    previewData: { person: { name: { firstName: 'Preview' } }, company: { name: 'Sandbox' } },
    principal: viewerPrincipal,
    api,
  });

  assert.equal(output.ok, true);
  assert.match(output.html, /Hello Preview/);
  assert.match(output.html, /SANDBOX/);
});

test('renderTemplateLogic rejects missing permission, inactive templates, and render errors predictably', async () => {
  const api = createFixtureApi();
  await assert.rejects(
    () => renderTemplateLogic({ templateId: 'template-1', previewData: {}, principal: { permissionScopes: [] }, api }),
    PermissionDeniedError,
  );

  const inactive = await renderTemplateLogic({
    templateId: 'inactive-template',
    previewData: {},
    principal: generatorPrincipal,
    api,
  });
  assert.equal(inactive.ok, false);
  assert.equal(inactive.errors[0].code, 'TEMPLATE_INACTIVE');

  const missingStrict = await renderTemplateLogic({
    templateId: 'template-1',
    previewData: {},
    strictMissingVariables: true,
    principal: generatorPrincipal,
    api,
  });
  assert.equal(missingStrict.ok, false);
  assert.match(missingStrict.errors.map((error) => error.message).join('\n'), /Missing required template variable/);
});

test('saveGeneratedDocumentLogic persists generatedDocument records through the Twenty API adapter', async () => {
  const api = createFixtureApi();
  const saved = await saveGeneratedDocumentLogic({
    templateId: 'template-1',
    primaryObjectType: 'person',
    primaryRecordId: 'person-1',
    renderedHtml: '<h1>Hello Ada</h1>',
    pdfUrl: 'https://files.example/generated-1.pdf',
    status: 'PDF_GENERATED',
    warnings: ['Rendered with fixture data'],
    metadata: { source: 'integration-test' },
    principal: generatorPrincipal,
    api,
    currentUser: { id: 'user-1', displayName: 'Ada Admin' },
  });

  assert.equal(saved.ok, true);
  assert.equal(saved.id, 'generated-1');
  assert.equal(api.created.length, 1);
  assert.deepEqual(api.created[0], {
    id: 'generated-1',
    name: 'Generated document for person person-1',
    templateId: 'template-1',
    primaryObjectType: 'person',
    primaryRecordId: 'person-1',
    renderedHtml: '<h1>Hello Ada</h1>',
    pdfUrl: 'https://files.example/generated-1.pdf',
    status: 'PDF_GENERATED',
    errorMessage: null,
    generatedBy: 'user-1',
    generatedAt: api.created[0].generatedAt,
    metadata: { source: 'integration-test', warnings: ['Rendered with fixture data'] },
  });
});

test('saveGeneratedDocumentLogic enforces generateDocuments permission and surfaces API errors', async () => {
  await assert.rejects(
    () => saveGeneratedDocumentLogic({
      templateId: 'template-1',
      renderedHtml: '<p>Nope</p>',
      principal: viewerPrincipal,
      api: createFixtureApi(),
    }),
    PermissionDeniedError,
  );

  const failed = await saveGeneratedDocumentLogic({
    templateId: 'template-1',
    renderedHtml: '<p>Nope</p>',
    principal: generatorPrincipal,
    api: { async createRecord() { throw new Error('local Twenty API unavailable'); } },
  });

  assert.equal(failed.ok, false);
  assert.match(failed.errors[0].message, /local Twenty API unavailable/);
});
