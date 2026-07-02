import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/sdk/index.ts',
  'src/sdk/types.ts',
  'examples/sdk-usage.ts',
  'tests/types/sdk-exports.test-d.ts',
];

test('public SDK modules, usage example, and declaration tests exist and are exported', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'createDocumentsTemplatesSdk',
    'renderTemplate',
    'generatePdfFromHtml',
    'registerContextProvider',
    'listTemplates',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }

  const example = read('examples/sdk-usage.ts');
  assert.match(example, /createDocumentsTemplatesSdk/);
  assert.match(example, /renderTemplate/);
  assert.match(example, /generatePdfFromHtml/);
    assert.match(example, /registerContextProvider/);
  assert.match(example, /listTemplates/);
});

const {
  createDocumentsTemplatesSdk,
  renderTemplate,
  generatePdfFromHtml,
  registerContextProvider,
  listTemplates,
} = await import('../dist/sdk/index.js');

const principal = { permissionScopes: ['viewTemplates', 'generateDocuments'] };
const templateRecords = [
  {
    id: 'template-1',
    name: 'Invoice',
    slug: 'invoice',
    status: 'ACTIVE',
    isActive: true,
    htmlSource: '<h1>Invoice for {{person.name}}</h1>',
    renderer: 'HANDLEBARS',
    category: 'Sales',
    version: 3,
  },
  {
    id: 'template-2',
    name: 'Archived quote',
    slug: 'archived-quote',
    status: 'ARCHIVED',
    isActive: false,
    htmlSource: '<p>Archived</p>',
    renderer: 'HANDLEBARS',
  },
];

const createApi = () => {
  const updates = [];
  return {
    updates,
    async getRecord(objectName, id) {
      assert.equal(objectName, 'documentTemplate');
      return templateRecords.find((template) => template.id === id) ?? null;
    },
    async listRecords(objectName, options) {
      assert.equal(objectName, 'documentTemplate');
      assert.equal(options?.activeOnly, true);
      assert.equal(options?.search, 'inv');
      return templateRecords.filter((template) => template.isActive);
    },
    async updateRecord(objectName, id, data) {
      updates.push({ objectName, id, data });
      return { id, ...data };
    },
  };
};

test('SDK wrappers render templates and generate PDFs through typed runtime adapters', async () => {
  const api = createApi();
  const sdk = createDocumentsTemplatesSdk({
    principal,
    api,
    pdfAdapter: {
      async renderHtmlToPdf(input) {
        assert.match(input.html, /Ada/);
        return new Uint8Array([37, 80, 68, 70]);
      },
    },
    storageAdapter: {
      async uploadFile(input) {
        assert.equal(input.contentType, 'application/pdf');
        return { url: `twenty://files/${input.fileName}`, fileId: 'file-1' };
      },
      async attachFileToRecord() {
        return { attachmentId: 'attachment-1' };
      },
    },
  });

  const rendered = await sdk.renderTemplate({
    templateId: 'template-1',
    primaryObjectType: 'person',
    primaryRecordId: 'ada-1',
    contextOverrides: { person: { name: 'Ada' } },
  });
  assert.equal(rendered.ok, true);
  assert.match(rendered.html, /Invoice for Ada/);

  const pdf = await sdk.generatePdfFromHtml({
    html: rendered.html,
    documentId: 'generated-1',
    fileName: 'Invoice Ada',
  });
  assert.equal(pdf.ok, true);
  assert.match(pdf.pdfUrl, /invoice-ada\.pdf$/);
});

test('SDK listTemplates filters template summaries and top-level wrappers accept explicit runtime', async () => {
  const api = createApi();

  const templates = await listTemplates({ activeOnly: true, search: 'inv' }, { principal, api });
  assert.deepEqual(templates, [{
    id: 'template-1',
    name: 'Invoice',
    slug: 'invoice',
    status: 'ACTIVE',
    isActive: true,
    renderer: 'HANDLEBARS',
    category: 'Sales',
    version: 3,
  }]);

  const rendered = await renderTemplate({
    templateId: 'template-1',
    contextOverrides: { person: { name: 'Grace' } },
  }, { principal, api });
  assert.match(rendered.html, /Grace/);

  const pdf = await generatePdfFromHtml({
    html: '<p>Standalone</p>',
  }, {
    principal,
    api,
    pdfAdapter: { async renderHtmlToPdf() { return new Uint8Array([1, 2, 3]); } },
    storageAdapter: { async uploadFile() { return { url: 'twenty://files/standalone.pdf' }; } },
  });
  assert.equal(pdf.pdfUrl, 'twenty://files/standalone.pdf');
});

test('SDK provider registration is namespaced to the SDK registry by default', async () => {
  const sdk = createDocumentsTemplatesSdk({ principal, api: createApi() });

  registerContextProvider('hostBill', async ({ primaryRecordId }) => ({
    context: { hostBill: { invoiceId: primaryRecordId, total: '$42.00' } },
    warnings: [],
  }), sdk.runtime);

  const rendered = await sdk.renderTemplate({
    templateId: 'template-1',
    primaryObjectType: 'hostBill',
    primaryRecordId: 'invoice-42',
    contextOverrides: { person: { name: 'Ada' } },
  });

  assert.equal(rendered.ok, true);
  assert.equal(rendered.context.hostBill.invoiceId, 'invoice-42');
  assert.equal(rendered.context.hostBill.total, '$42.00');
});
