import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/logic/acceptance-hardening.ts',
];

test('acceptance hardening module exists and is publicly exported', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'ACCEPTANCE_SCENARIOS',
    'runAcceptanceScenario',
    'renderRtlSmokeFixture',
    'validateGeneratedDocumentAuditTrail',
    'sanitizeGeneratedDocumentHtml',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});

const { PermissionDeniedError } = await import('../dist/permissions/permission-guards.js');
const { renderHandlebarsTemplate } = await import('../dist/logic/rendering/handlebars-renderer.js');
const { generatePdfFromHtmlLogic } = await import('../dist/logic/generate-pdf.js');
const { buildGeneratedDocumentRecord } = await import('../dist/logic/save-generated-document.js');
const {
  ACCEPTANCE_SCENARIOS,
  runAcceptanceScenario,
  renderRtlSmokeFixture,
  sanitizeGeneratedDocumentHtml,
  validateGeneratedDocumentAuditTrail,
} = await import('../dist/logic/acceptance-hardening.js');
const {
  renderGenerateDocumentModalMarkup,
  createGenerateDocumentState,
} = await import('../dist/front-components/generate-document.front-component.js');
const {
  renderTemplateEditorMarkup,
  createTemplateEditorState,
} = await import('../dist/front-components/template-editor.front-component.js');

const generatorPrincipal = { permissionScopes: ['viewTemplates', 'manageTemplates', 'generateDocuments', 'viewGeneratedDocs'] };
const viewerPrincipal = { permissionScopes: ['viewTemplates'] };

const fixtureTemplate = {
  id: 'template-utf8',
  name: 'Contrat Bienvenue',
  isActive: true,
  status: 'ACTIVE',
  htmlSource: '<main><h1>Bonjour {{person.name}}</h1><p>{{company.name}} — {{message}}</p><p>{{unsafe}}</p></main>',
  cssSource: 'main { font-family: "Noto Sans", sans-serif; }',
  renderer: 'HANDLEBARS',
};

const createFixtureApi = () => ({
  async getRecord(objectName, id) {
    if (objectName === 'documentTemplate' && id === fixtureTemplate.id) return fixtureTemplate;
    return null;
  },
  async createRecord(objectName, data) {
    assert.equal(objectName, 'generatedDocument');
    return { id: 'generated-acceptance-1', ...data };
  },
  async updateRecord(objectName, id, data) {
    assert.equal(objectName, 'generatedDocument');
    return { id, ...data };
  },
});

test('acceptance scenarios cover install, permissions, template preview, generation, PDF, workflow, UI, and security criteria', async () => {
  const requiredIds = [
    'general-installation',
    'general-objects-permissions-settings',
    'template-management-create-edit-preview-list-delete',
    'document-generation-single-pdf-save-bulk',
    'workflow-registration-context-error-handling',
    'ui-accessibility-responsiveness-feedback',
    'security-injection-attachment-policy',
  ];

  assert.deepEqual(ACCEPTANCE_SCENARIOS.map((scenario) => scenario.id), requiredIds);
  const executed = await runAcceptanceScenario('document-generation-single-pdf-save-bulk', {
    permissions: generatorPrincipal.permissionScopes,
    appInstalled: true,
    objectsRegistered: ['DocumentTemplate', 'TemplateCategory', 'GeneratedDocument'],
    settingsPersist: true,
    templatePreviewOk: true,
    generatedDocumentSaved: true,
    pdfGenerated: true,
    bulkResultsSaved: 2,
    workflowActionsRegistered: ['Render Template', 'Generate PDF', 'Save Generated Document'],
    uiAccessible: true,
    securityEscapingOk: true,
  });

  assert.equal(executed.ok, true);
  assert.equal(executed.scenarioId, 'document-generation-single-pdf-save-bulk');
  assert.match(executed.evidence.join('\n'), /bulk generation saved 2 records/i);

});

test('modal and editor controls expose keyboard-friendly labels, dialog roles, live regions, and responsive stack hints', () => {
  const editorMarkup = renderTemplateEditorMarkup(createTemplateEditorState({
    template: {
      name: 'Accessible',
      slug: 'accessible',
      htmlSource: '<h1>{{person.name}}</h1>',
      variables: [{ path: 'person.name', label: 'Person name', required: true }],
    },
  }));
  assert.match(editorMarkup, /role="tablist"/);
  assert.match(editorMarkup, /aria-label="Template editor tabs"/);
  assert.match(editorMarkup, /role="listbox"[^>]*aria-label="Available template variables"/);
  assert.match(editorMarkup, /data-responsive-layout="split-stack"/);
  assert.match(editorMarkup, /aria-live="polite"/);

  const generateMarkup = renderGenerateDocumentModalMarkup(createGenerateDocumentState({
    primaryObjectType: 'person',
    primaryRecordId: 'person-1',
    templates: [{ id: 'template-1', name: 'Welcome', isActive: true }],
    selectedTemplateId: 'template-1',
    isGenerating: true,
  }));
  assert.match(generateMarkup, /role="dialog"/);
  assert.match(generateMarkup, /aria-modal="true"/);
  assert.match(generateMarkup, /aria-busy="true"/);
  assert.match(generateMarkup, /aria-label="Document template"/);
  assert.match(generateMarkup, /aria-label="Rendered document preview"/);
  assert.match(generateMarkup, /Generating document…/);
});

test('UTF-8 and RTL smoke fixtures render through HTML and PDF metadata without mojibake', async () => {
  const rtl = renderRtlSmokeFixture({
    locale: 'ar',
    direction: 'rtl',
    title: 'مرحبا يا Ada',
    body: 'שלום עולם — Привет мир — café',
  });
  assert.match(rtl.html, /dir="rtl"/);
  assert.match(rtl.html, /lang="ar"/);
  assert.match(rtl.html, /مرحبا/);
  assert.match(rtl.html, /שלום עולם/);

  const rendered = renderHandlebarsTemplate({
    htmlSource: fixtureTemplate.htmlSource,
    cssSource: fixtureTemplate.cssSource,
    context: { person: { name: 'Zoë 李' }, company: { name: 'München GmbH' }, message: 'مرحبا — €42', unsafe: '<script>alert("x")</script>' },
  });
  assert.equal(rendered.errors.length, 0);
  assert.match(rendered.html, /Bonjour Zoë 李/);
  assert.match(rendered.html, /München GmbH — مرحبا — €42/);
  assert.match(rendered.html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);

  const pdfCalls = [];
  const pdf = await generatePdfFromHtmlLogic({
    html: rtl.html,
    generatedDocumentId: 'generated-utf8',
    fileName: 'مرحبا café.pdf',
    principal: generatorPrincipal,
    adapter: { async renderHtmlToPdf(input) { pdfCalls.push(input); return Buffer.from('%PDF-1.4\nمرحبا café\n%%EOF', 'utf8'); } },
    storage: { async uploadFile(input) {
      assert.equal(input.contentType, 'application/pdf');
      assert.equal(input.metadata.generatedDocumentId, 'generated-utf8');
      assert.match(Buffer.from(input.body).toString('utf8'), /مرحبا café/);
      return { url: 'twenty://files/generated-utf8.pdf' };
    } },
  });
  assert.equal(pdf.ok, true);
  assert.match(pdfCalls[0].html, /שלום עולם/);
});

test('security hardening checks escaping and generated-document audit trail', async () => {
  const sanitized = sanitizeGeneratedDocumentHtml('<h1>Hi</h1><script>alert(1)</script><a href="javascript:alert(2)">bad</a><p onclick="x">ok</p>');
  assert.equal(sanitized, '<h1>Hi</h1><a href="#blocked">bad</a><p>ok</p>');

  const auditRecord = buildGeneratedDocumentRecord({
    templateId: fixtureTemplate.id,
    primaryObjectType: 'person',
    primaryRecordId: 'person-1',
    renderedHtml: '<h1>Audit</h1>',
    pdfUrl: 'twenty://files/generated-1.pdf',
    status: 'PDF_GENERATED',
    generatedAt: '2026-05-06T07:08:09.000Z',
    currentUser: { id: 'user-1' },
    metadata: { source: 'acceptance-hardening' },
  });
  const audit = validateGeneratedDocumentAuditTrail(auditRecord);
  assert.equal(audit.ok, true);
  assert.deepEqual(audit.missing, []);

  const missingAudit = validateGeneratedDocumentAuditTrail({ templateId: fixtureTemplate.id, renderedHtml: '<p>missing</p>' });
  assert.equal(missingAudit.ok, false);
  assert.deepEqual(missingAudit.missing.sort(), ['generatedAt', 'generatedBy', 'primaryObjectType', 'primaryRecordId', 'status']);
});
