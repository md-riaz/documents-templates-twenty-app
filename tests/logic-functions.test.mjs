import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/logic-functions/render-template.logic-function.ts',
  'src/logic-functions/generate-pdf.logic-function.ts',
  'src/logic-functions/save-generated-document.logic-function.ts',
];

test('logic-function modules exist as source files', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }
});

const renderModule = await import('../dist/logic-functions/render-template.logic-function.js');
const pdfModule = await import('../dist/logic-functions/generate-pdf.logic-function.js');
const saveModule = await import('../dist/logic-functions/save-generated-document.logic-function.js');
const { createCoreRecordApi, coreClientToGraphqlClient } = await import('../dist/logic-functions/core-client-adapters.js');

const { runRenderTemplate } = renderModule;
const { runGeneratePdf } = pdfModule;
const { runSaveGeneratedDocument } = saveModule;

// The modules are compiled to CommonJS; Node's ESM interop nests the TS `export default`
// under the synthesized namespace default (module.exports.default).
const defaultExport = (mod) => mod.default?.default ?? mod.default;

const templateRecord = {
  id: 'template-1',
  name: 'Invoice',
  htmlSource: '<h1>Invoice for {{person.name}}</h1><p>Total {{amount}}</p>',
  status: 'ACTIVE',
  isActive: true,
  renderer: 'HANDLEBARS',
};

// Fake genql-style CoreApiClient so we exercise the CoreApiClient -> repository bridge.
const createFakeCoreClient = () => {
  const created = [];
  const updates = [];
  return {
    created,
    updates,
    async query(request) {
      const field = Object.keys(request)[0];
      if (field === 'documentTemplate') {
        const id = request[field].__args.filter.id.eq;
        return { documentTemplate: id === 'template-1' ? templateRecord : null };
      }
      throw new Error(`unexpected query field ${field}`);
    },
    async mutation(request) {
      const field = Object.keys(request)[0];
      if (field === 'createGeneratedDocument') {
        const record = { id: `generated-${created.length + 1}`, ...request[field].__args.data };
        created.push(record);
        return { createGeneratedDocument: record };
      }
      if (field === 'updateGeneratedDocument') {
        updates.push(request[field].__args);
        return { updateGeneratedDocument: { id: request[field].__args.id, ...request[field].__args.data } };
      }
      throw new Error(`unexpected mutation field ${field}`);
    },
  };
};

const createPdfFixture = () => {
  const pdfs = [];
  const attachments = [];
  return {
    pdfs,
    attachments,
    adapter: {
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
  };
};

test('logic functions register valid workflow actions with expected labels, icons, and identifiers', () => {
  const render = defaultExport(renderModule);
  const pdf = defaultExport(pdfModule);
  const save = defaultExport(saveModule);

  assert.equal(render.success, true);
  assert.equal(pdf.success, true);
  assert.equal(save.success, true);

  assert.deepEqual(
    [
      render.config.workflowActionTriggerSettings.label,
      pdf.config.workflowActionTriggerSettings.label,
      save.config.workflowActionTriggerSettings.label,
    ],
    ['Render Template', 'Generate PDF', 'Save Generated Document'],
  );

  assert.equal(render.config.universalIdentifier, '1fcdb464-9f52-4904-81e4-bdadf3652237');
  assert.equal(pdf.config.universalIdentifier, '97e4bf7b-b731-45e1-9f0c-098d2cdbfc63');
  assert.equal(save.config.universalIdentifier, '9c896b3e-cf3b-4007-b2d9-2c1cdfc0505e');

  assert.equal(pdf.config.workflowActionTriggerSettings.icon, 'IconFilePdf');
  // inputSchema is produced by jsonSchemaToInputSchema (array with an object property map).
  const renderInput = render.config.workflowActionTriggerSettings.inputSchema[0];
  assert.equal(renderInput.type, 'object');
  assert.ok('templateId' in renderInput.properties);
});

test('CoreApiClient record bridge translates getRecord/createRecord/updateRecord genql calls', async () => {
  const client = createFakeCoreClient();
  const api = createCoreRecordApi(client);

  assert.deepEqual(await api.getRecord('documentTemplate', 'template-1'), templateRecord);
  assert.equal(await api.getRecord('documentTemplate', 'missing'), null);

  const created = await api.createRecord('generatedDocument', { name: 'Doc' });
  assert.equal(created.id, 'generated-1');
  assert.equal(client.created.length, 1);

  const updated = await api.updateRecord('generatedDocument', 'generated-1', { status: 'PDF_GENERATED' });
  assert.equal(updated.status, 'PDF_GENERATED');
  assert.deepEqual(client.updates[0], { id: 'generated-1', data: { status: 'PDF_GENERATED' } });
});

test('coreClientToGraphqlClient forwards raw requests and normalizes the { data } envelope', async () => {
  const calls = [];
  const bridged = coreClientToGraphqlClient({
    query: async (request) => {
      calls.push(request);
      return { data: { uploadFile: { id: 'file-1', url: 'twenty://files/x', name: 'x' } } };
    },
  });
  const result = await bridged.query({ query: 'mutation UploadFile { ... }', variables: { file: {} } });
  assert.equal(result.data.uploadFile.id, 'file-1');
  assert.equal(calls[0].query, 'mutation UploadFile { ... }');
});

test('render -> save -> generate PDF chains through the logic function handlers', async () => {
  const client = createFakeCoreClient();

  const render = await runRenderTemplate(
    { templateId: 'template-1', contextOverrides: { person: { name: 'Ada' }, amount: '$42.00' } },
    { client },
  );
  assert.equal(render.ok, true);
  assert.match(render.html, /Invoice for Ada/);
  assert.match(render.html, /Total \$42\.00/);
  assert.equal(render.template.id, 'template-1');

  const saved = await runSaveGeneratedDocument(
    {
      templateId: 'template-1',
      primaryObjectType: 'person',
      primaryRecordId: 'person-1',
      renderedHtml: render.html,
      status: 'RENDERED',
    },
    { client },
  );
  assert.equal(saved.generatedDocumentId, 'generated-1');
  assert.equal(client.created[0].renderedHtml, render.html);

  const pdfFixture = createPdfFixture();
  const pdf = await runGeneratePdf(
    {
      html: render.html,
      generatedDocumentId: saved.generatedDocumentId,
      sourceObjectName: 'person',
      sourceRecordId: 'person-1',
      fileName: 'Invoice Ada',
    },
    { adapter: pdfFixture.adapter, storage: pdfFixture.storage, api: createCoreRecordApi(client) },
  );

  assert.equal(pdf.status, 'PDF_GENERATED');
  assert.match(pdf.pdfUrl, /generated-document-generated-1-invoice-ada\.pdf$/);
  assert.equal(pdf.attachmentId, 'attachment-1');
  assert.deepEqual(pdfFixture.attachments[0], {
    objectName: 'person',
    recordId: 'person-1',
    fileId: 'file-1',
    fileUrl: pdf.pdfUrl,
    fileName: 'generated-document-generated-1-invoice-ada.pdf',
    contentType: 'application/pdf',
    metadata: { generatedDocumentId: saved.generatedDocumentId },
  });
  // The generatedDocument record was updated to PDF_GENERATED through the genql bridge.
  assert.equal(client.updates.at(-1).data.status, 'PDF_GENERATED');
});

test('render handler produces isolated output per bulk iterator record', async () => {
  const client = createFakeCoreClient();
  const records = [
    { primaryObjectType: 'person', primaryRecordId: 'person-1', contextOverrides: { person: { name: 'Ada' }, amount: '$42.00' } },
    { primaryObjectType: 'person', primaryRecordId: 'person-2', contextOverrides: { person: { name: 'Grace' }, amount: '$84.00' } },
  ];

  const outputs = [];
  for (const record of records) {
    outputs.push(await runRenderTemplate({ templateId: 'template-1', ...record }, { client }));
  }

  assert.match(outputs[0].html, /Invoice for Ada/);
  assert.match(outputs[0].html, /Total \$42\.00/);
  assert.match(outputs[1].html, /Invoice for Grace/);
  assert.match(outputs[1].html, /Total \$84\.00/);
  assert.notEqual(outputs[0].html, outputs[1].html);
});
