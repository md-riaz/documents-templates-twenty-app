import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/workflow-actions/document-workflow-actions.ts',
];

test('document workflow actions module exists and is publicly exported', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'documentWorkflowActions',
    'renderTemplateWorkflowAction',
    'generatePdfWorkflowAction',
    'sendTemplatedEmailWorkflowAction',
    'saveGeneratedDocumentWorkflowAction',
    'runDocumentWorkflowAction',
    'GLOBAL_TRIGGER_REQUIREMENTS',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});

const {
  documentWorkflowActions,
  renderTemplateWorkflowAction,
  generatePdfWorkflowAction,
  sendTemplatedEmailWorkflowAction,
  saveGeneratedDocumentWorkflowAction,
  runDocumentWorkflowAction,
  GLOBAL_TRIGGER_REQUIREMENTS,
} = await import('../dist/workflow-actions/document-workflow-actions.js');

const principal = { permissionScopes: ['generateDocuments', 'sendEmails'] };
const templateRecord = {
  id: 'template-1',
  name: 'Invoice',
  htmlSource: '<h1>Invoice for {{person.name}}</h1><p>Total {{amount}}</p>',
  defaultSubject: 'Invoice for {{person.name}}',
  status: 'ACTIVE',
  isActive: true,
  renderer: 'HANDLEBARS',
};

const createWorkflowFixture = () => {
  const records = [];
  const updates = [];
  const emails = [];
  const pdfs = [];
  const attachments = [];
  return {
    attachments,
    records,
    updates,
    emails,
    pdfs,
    api: {
      async getRecord(objectName, id) {
        assert.equal(objectName, 'documentTemplate');
        assert.equal(id, 'template-1');
        return templateRecord;
      },
      async createRecord(objectName, data) {
        assert.equal(objectName, 'generatedDocument');
        const record = { id: `generated-${records.length + 1}`, ...data };
        records.push(record);
        return record;
      },
      async updateRecord(objectName, id, data) {
        assert.equal(objectName, 'generatedDocument');
        updates.push({ objectName, id, data });
        return { id, ...data };
      },
    },
    pdfAdapter: {
      async renderHtmlToPdf(input) {
        pdfs.push(input);
        assert.match(input.html, /Invoice for Ada/);
        return new Uint8Array([37, 80, 68, 70]);
      },
    },
    storage: {
      async uploadFile(input) {
        assert.equal(input.contentType, 'application/pdf');
        return { url: `twenty://files/${input.fileName}`, fileId: 'file-1' };
      },
      async attachFileToRecord(input) {
        attachments.push(input);
        return { attachmentId: `attachment-${attachments.length}` };
      },
    },
    emailAdapter: {
      async sendEmail(input) {
        emails.push(input);
        assert.deepEqual(input.to, ['buyer@example.com']);
        return { messageId: `msg-${emails.length}` };
      },
    },
  };
};

test('workflow actions register required names, scopes, outputs, and trigger pattern guidance', () => {
  assert.deepEqual(documentWorkflowActions.map((action) => action.name), [
    'Render Template',
    'Generate PDF',
    'Send Templated Email',
    'Save Generated Document',
  ]);

  assert.equal(renderTemplateWorkflowAction.key, 'documents.renderTemplate');
  assert.deepEqual(renderTemplateWorkflowAction.triggerPatterns, ['Single', 'BulkIterator']);
  assert.deepEqual(renderTemplateWorkflowAction.requiredScopes, ['generateDocuments']);
  assert.deepEqual(renderTemplateWorkflowAction.outputs, ['html', 'context', 'warnings', 'template']);

  assert.equal(generatePdfWorkflowAction.key, 'documents.generatePdf');
  assert.deepEqual(generatePdfWorkflowAction.inputsFrom, ['html', 'generatedDocumentId', 'primaryObjectType', 'primaryRecordId']);
  assert.deepEqual(sendTemplatedEmailWorkflowAction.requiredScopes, ['sendEmails']);
  assert.deepEqual(saveGeneratedDocumentWorkflowAction.outputs, ['generatedDocumentId', 'record']);

  assert.match(GLOBAL_TRIGGER_REQUIREMENTS, /Global triggers do not provide a primary record/);
  assert.match(GLOBAL_TRIGGER_REQUIREMENTS, /templateId/);
  assert.match(GLOBAL_TRIGGER_REQUIREMENTS, /contextOverrides or previewData/);
});

test('workflow action runner chains render output into PDF, save, and email actions', async () => {
  const fixture = createWorkflowFixture();

  const render = await runDocumentWorkflowAction(renderTemplateWorkflowAction, {
    templateId: 'template-1',
    contextOverrides: { person: { name: 'Ada' }, amount: '$42.00' },
    principal,
    api: fixture.api,
  });
  assert.equal(render.ok, true);
  assert.match(render.html, /Invoice for Ada/);
  assert.equal(render.template.id, 'template-1');

  const saved = await runDocumentWorkflowAction(saveGeneratedDocumentWorkflowAction, {
    templateId: 'template-1',
    primaryObjectType: 'person',
    primaryRecordId: 'person-1',
    renderedHtml: render.html,
    warnings: render.warnings,
    principal,
    api: fixture.api,
    currentUser: { id: 'user-1' },
  });
  assert.equal(saved.ok, true);
  assert.equal(saved.generatedDocumentId, 'generated-1');
  assert.equal(fixture.records[0].renderedHtml, render.html);

  const pdf = await runDocumentWorkflowAction(generatePdfWorkflowAction, {
    html: render.html,
    generatedDocumentId: saved.generatedDocumentId,
    sourceObjectName: 'person',
    sourceRecordId: 'person-1',
    fileName: 'Invoice Ada',
    principal,
    api: fixture.api,
    adapter: fixture.pdfAdapter,
    storage: fixture.storage,
    now: new Date('2026-04-05T06:07:08Z'),
  });
  assert.equal(pdf.ok, true);
  assert.match(pdf.pdfUrl, /generated-document-generated-1-invoice-ada\.pdf$/);
  assert.deepEqual(fixture.attachments[0], {
    objectName: 'person',
    recordId: 'person-1',
    fileId: 'file-1',
    fileUrl: pdf.pdfUrl,
    fileName: 'generated-document-generated-1-invoice-ada.pdf',
    contentType: 'application/pdf',
    metadata: { generatedDocumentId: saved.generatedDocumentId },
  });
  assert.equal(fixture.updates[0].data.status, 'PDF_GENERATED');

  const emailed = await runDocumentWorkflowAction(sendTemplatedEmailWorkflowAction, {
    renderedHtml: render.html,
    recipients: ['buyer@example.com'],
    subjectOverride: 'Invoice for {{person.name}}',
    contextOverrides: render.context,
    generatedDocumentId: saved.generatedDocumentId,
    principal,
    api: fixture.api,
    adapter: fixture.emailAdapter,
    now: new Date('2026-04-05T06:08:09Z'),
  });
  assert.equal(emailed.ok, true);
  assert.equal(emailed.messageId, 'msg-1');
  assert.equal(fixture.emails[0].subject, 'Invoice for Ada');
  assert.equal(fixture.updates.at(-1).data.status, 'EMAIL_SENT');
});

test('workflow action runner supports iterator-friendly bulk records without shared mutable output', async () => {
  const fixture = createWorkflowFixture();
  const records = [
    { primaryObjectType: 'person', primaryRecordId: 'person-1', contextOverrides: { person: { name: 'Ada' }, amount: '$42.00' } },
    { primaryObjectType: 'person', primaryRecordId: 'person-2', contextOverrides: { person: { name: 'Grace' }, amount: '$84.00' } },
  ];

  const outputs = [];
  for (const record of records) {
    outputs.push(await runDocumentWorkflowAction(renderTemplateWorkflowAction, {
      templateId: 'template-1',
      ...record,
      principal,
      api: fixture.api,
    }));
  }

  assert.deepEqual(outputs.map((output) => output.context.person.name), ['Ada', 'Grace']);
  assert.match(outputs[0].html, /Total \$42\.00/);
  assert.match(outputs[1].html, /Total \$84\.00/);
  assert.notEqual(outputs[0].html, outputs[1].html);
});
