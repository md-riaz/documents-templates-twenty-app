import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/logic/settings/pdf-settings.ts',
  'src/logic/generate-pdf.ts',
  'src/front-components/pdf-settings.front-component.tsx',
];

test('PDF engine and settings modules exist and are publicly exported', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'DEFAULT_PDF_SETTINGS',
    'mapPdfSettingsToBrowserOptions',
    'generatePdfFromHtmlLogic',
    'renderPdfSettingsMarkup',
    'pdfSettingsFrontComponent',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});

const { PermissionDeniedError } = await import('../dist/permissions/permission-guards.js');
const {
  DEFAULT_PDF_SETTINGS,
  normalizePdfSettings,
  mapPdfSettingsToBrowserOptions,
} = await import('../dist/logic/settings/pdf-settings.js');
const {
  generatePdfFromHtmlLogic,
  createPdfStorageKey,
} = await import('../dist/logic/generate-pdf.js');
const {
  createPdfSettingsState,
  renderPdfSettingsMarkup,
  validatePdfSettingsState,
} = await import('../dist/front-components/pdf-settings.front-component.js');

const generatorPrincipal = { permissionScopes: ['generateDocuments'] };
const viewerPrincipal = { permissionScopes: ['viewTemplates'] };

test('PDF settings normalize workspace defaults and map to browser PDF options', () => {
  const settings = normalizePdfSettings({
    defaults: {
      format: 'Letter',
      orientation: 'landscape',
      marginTop: '12mm',
      marginRight: '8mm',
      marginBottom: '14mm',
      marginLeft: '8mm',
      printBackground: false,
      headerTemplate: '<span>Header</span>',
      footerTemplate: '<span class="pageNumber"></span>',
    },
    override: {
      format: 'A4',
      marginLeft: '1in',
      printBackground: true,
    },
  });

  assert.equal(settings.format, 'A4');
  assert.equal(settings.orientation, 'landscape');
  assert.equal(settings.marginLeft, '1in');
  assert.equal(settings.marginTop, '12mm');
  assert.equal(settings.printBackground, true);
  assert.equal(settings.headerTemplate, '<span>Header</span>');

  const options = mapPdfSettingsToBrowserOptions(settings);
  assert.deepEqual(options, {
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '12mm', right: '8mm', bottom: '14mm', left: '1in' },
    displayHeaderFooter: true,
    headerTemplate: '<span>Header</span>',
    footerTemplate: '<span class="pageNumber"></span>',
    preferCSSPageSize: true,
  });

  assert.equal(DEFAULT_PDF_SETTINGS.format, 'A4');
  assert.equal(DEFAULT_PDF_SETTINGS.orientation, 'portrait');
});

test('PDF settings UI exposes accessible admin fields and validation', () => {
  const state = createPdfSettingsState({
    settings: { format: 'Letter', orientation: 'landscape', marginTop: '12mm' },
  });
  const markup = renderPdfSettingsMarkup(state);

  assert.match(markup, /aria-label="PDF settings"/);
  assert.match(markup, /name="pdf-format"[^>]*value="Letter"/);
  assert.match(markup, /name="pdf-orientation"[^>]*value="landscape"/);
  assert.match(markup, /name="pdf-margin-top"[^>]*value="12mm"/);
  assert.match(markup, /name="pdf-print-background"[^>]*checked/);
  assert.match(markup, /aria-live="polite"/);

  assert.deepEqual(validatePdfSettingsState(state), []);

  // validatePdfSettingsState must be checked against RAW (non-normalized) input
  // here — createPdfSettingsState always normalizes invalid values to safe
  // defaults (that's the point of normalization), so it can never surface an
  // "unsupported format" error itself.
  const validationErrors = validatePdfSettingsState({ marginTop: '-1px', format: 'Receipt' }).join('\n');
  assert.match(validationErrors, /Unsupported PDF format/);
  assert.match(validationErrors, /Margin top must be a positive CSS length/);

  // createPdfSettingsState normalizes invalid values instead of passing them through.
  const normalizedFromInvalid = createPdfSettingsState({ settings: { marginTop: '-1px', format: 'Receipt' } });
  assert.deepEqual(validatePdfSettingsState(normalizedFromInvalid), []);
  assert.equal(normalizedFromInvalid.format, DEFAULT_PDF_SETTINGS.format);
});

test('generatePdfFromHtmlLogic renders simple HTML, uploads PDF, attaches it to source record, and updates GeneratedDocument', async () => {
  const calls = [];
  const adapter = {
    async renderHtmlToPdf(input) {
      calls.push({ type: 'render', input });
      assert.match(input.html, /<h1>Hello PDF<\/h1>/);
      assert.equal(input.options.format, 'Letter');
      assert.equal(input.options.landscape, false);
      assert.equal(input.options.margin.top, '10mm');
      return Buffer.from('%PDF-1.4\nHello PDF\n%%EOF');
    },
  };
  const storage = {
    async uploadFile(input) {
      calls.push({ type: 'upload', input });
      assert.equal(input.contentType, 'application/pdf');
      assert.match(input.fileName, /^generated-document-generated-1-.*\.pdf$/);
      assert.match(input.key, /^generated-documents\/generated-1\/.*\.pdf$/);
      assert.match(input.body.toString('utf8'), /%PDF-1.4/);
      return { url: `twenty://files/${input.key}`, fileId: 'file-1' };
    },
    async attachFileToRecord(input) {
      calls.push({ type: 'attach', input });
      assert.equal(input.objectName, 'person');
      assert.equal(input.recordId, 'person-1');
      assert.equal(input.fileId, 'file-1');
      assert.match(input.fileName, /^generated-document-generated-1-.*\.pdf$/);
      assert.equal(input.contentType, 'application/pdf');
      return { attachmentId: 'attachment-1' };
    },
  };
  const api = {
    async updateRecord(objectName, id, data) {
      calls.push({ type: 'update', objectName, id, data });
      assert.equal(objectName, 'generatedDocument');
      assert.equal(id, 'generated-1');
      assert.equal(data.status, 'PDF_GENERATED');
      assert.match(data.pdfUrl, /^twenty:\/\/files\/generated-documents\/generated-1\//);
      assert.deepEqual(data.metadata.sourceAttachment, {
        objectName: 'person',
        recordId: 'person-1',
        fileId: 'file-1',
        attachmentId: 'attachment-1',
      });
      return { id, ...data };
    },
  };

  const output = await generatePdfFromHtmlLogic({
    html: '<!doctype html><html><body><h1>Hello PDF</h1></body></html>',
    generatedDocumentId: 'generated-1',
    sourceObjectName: 'person',
    sourceRecordId: 'person-1',
    fileName: 'Generated Document #1.pdf',
    principal: generatorPrincipal,
    adapter,
    storage,
    api,
    settings: { format: 'Letter', marginTop: '10mm' },
  });

  assert.equal(output.ok, true);
  assert.match(output.pdfUrl, /^twenty:\/\/files\/generated-documents\/generated-1\//);
  assert.equal(output.status, 'PDF_GENERATED');
  assert.equal(output.bytes, Buffer.byteLength('%PDF-1.4\nHello PDF\n%%EOF'));
  assert.deepEqual(calls.map((call) => call.type), ['render', 'upload', 'attach', 'update']);
});

test('generatePdfFromHtmlLogic enforces permissions and reports adapter/storage failures', async () => {
  await assert.rejects(
    () => generatePdfFromHtmlLogic({
      html: '<p>Nope</p>',
      principal: viewerPrincipal,
      adapter: { async renderHtmlToPdf() { return Buffer.from('never'); } },
      storage: { async uploadFile() { return { url: 'never' }; } },
    }),
    PermissionDeniedError,
  );

  const failed = await generatePdfFromHtmlLogic({
    html: '<p>Broken</p>',
    generatedDocumentId: 'generated-2',
    principal: generatorPrincipal,
    adapter: { async renderHtmlToPdf() { throw new Error('Chromium executable missing'); } },
    storage: { async uploadFile() { return { url: 'never' }; } },
    api: {
      async updateRecord(objectName, id, data) {
        assert.equal(objectName, 'generatedDocument');
        assert.equal(id, 'generated-2');
        assert.equal(data.status, 'FAILED');
        assert.match(data.errorMessage, /Chromium executable missing/);
        return { id, ...data };
      },
    },
  });

  assert.equal(failed.ok, false);
  assert.equal(failed.status, 'FAILED');
  assert.match(failed.errors[0].userMessage, /PDF could not be generated/);
});

test('createPdfStorageKey creates safe deterministic storage paths for uploads', () => {
  assert.equal(
    createPdfStorageKey({ generatedDocumentId: 'generated/1', fileName: 'ACME Invoice #42.pdf', now: new Date('2026-02-03T04:05:06Z') }),
    'generated-documents/generated-1/2026-02-03T04-05-06-000Z-acme-invoice-42.pdf',
  );
  assert.equal(
    createPdfStorageKey({ fileName: '', now: new Date('2026-02-03T04:05:06Z') }),
    'generated-documents/unsaved/2026-02-03T04-05-06-000Z-document.pdf',
  );
});
