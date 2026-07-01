import { assertPermissionScope, type PermissionPrincipal } from '../permissions/permission-guards';
import {
  mapPdfSettingsToBrowserOptions,
  normalizePdfSettings,
  type BrowserPdfOptions,
  type PdfSettingsInput,
} from './settings/pdf-settings';

export type HtmlToPdfAdapter = {
  renderHtmlToPdf(input: { html: string; options: BrowserPdfOptions }): Promise<Uint8Array>;
};

export type PdfStorageAdapter = {
  uploadFile(input: {
    key: string;
    fileName: string;
    body: Uint8Array;
    contentType: 'application/pdf';
    metadata?: Record<string, unknown>;
  }): Promise<{ url: string }>;
};

export type GeneratedDocumentUpdateApi = {
  updateRecord?: (objectName: string, id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

export type GeneratePdfFromHtmlInput = {
  html: string;
  settings?: PdfSettingsInput;
  workspaceDefaults?: PdfSettingsInput;
  generatedDocumentId?: string;
  fileName?: string;
  principal?: PermissionPrincipal;
  adapter?: HtmlToPdfAdapter;
  storage?: PdfStorageAdapter;
  api?: GeneratedDocumentUpdateApi;
  metadata?: Record<string, unknown>;
  now?: Date;
};

export type GeneratePdfFromHtmlOutput = {
  ok: boolean;
  pdfUrl?: string;
  bytes?: number;
  status: 'PDF_GENERATED' | 'FAILED';
  options: BrowserPdfOptions;
  errors: Array<{ code: string; message: string; userMessage: string }>;
};

const slugify = (value: string, fallback: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
};

const safeSegment = (value: string | undefined, fallback: string): string => {
  if (!value) return fallback;
  const segment = value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return segment || fallback;
};

const timestampForKey = (date: Date): string => date.toISOString().replaceAll(':', '-').replaceAll('.', '-');

export const createPdfStorageKey = (input: { generatedDocumentId?: string; fileName?: string; now?: Date }): string => {
  const now = input.now ?? new Date();
  const ownerSegment = safeSegment(input.generatedDocumentId, 'unsaved');
  const fileSegment = slugify(input.fileName ?? '', 'document');
  return `generated-documents/${ownerSegment}/${timestampForKey(now)}-${fileSegment}.pdf`;
};

const defaultPdfAdapter: HtmlToPdfAdapter = {
  async renderHtmlToPdf() {
    throw new Error('No Playwright/Puppeteer PDF adapter configured for this runtime.');
  },
};

const defaultStorageAdapter: PdfStorageAdapter = {
  async uploadFile() {
    throw new Error('No Twenty file storage adapter configured for PDF uploads.');
  },
};

const updateGeneratedDocument = async (
  api: GeneratedDocumentUpdateApi | undefined,
  generatedDocumentId: string | undefined,
  data: Record<string, unknown>,
): Promise<void> => {
  if (generatedDocumentId) {
    await api?.updateRecord?.('generatedDocument', generatedDocumentId, data);
  }
};

export const generatePdfFromHtmlLogic = async (input: GeneratePdfFromHtmlInput): Promise<GeneratePdfFromHtmlOutput> => {
  assertPermissionScope(input.principal, 'generateDocuments');

  const settings = normalizePdfSettings({ defaults: input.workspaceDefaults, override: input.settings });
  const options = mapPdfSettingsToBrowserOptions(settings);
  const adapter = input.adapter ?? defaultPdfAdapter;
  const storage = input.storage ?? defaultStorageAdapter;
  const now = input.now ?? new Date();
  const safeBaseName = slugify(input.fileName ?? 'generated-document', 'generated-document');
  const generatedPrefix = input.generatedDocumentId ? `generated-document-${safeSegment(input.generatedDocumentId, 'unsaved')}` : 'generated-document';
  const fileName = `${generatedPrefix}-${safeBaseName}.pdf`;
  const key = createPdfStorageKey({ generatedDocumentId: input.generatedDocumentId, fileName: safeBaseName, now });

  try {
    const body = await adapter.renderHtmlToPdf({ html: input.html, options });
    const uploaded = await storage.uploadFile({
      key,
      fileName,
      body,
      contentType: 'application/pdf',
      metadata: {
        ...(input.metadata ?? {}),
        generatedDocumentId: input.generatedDocumentId ?? null,
      },
    });

    await updateGeneratedDocument(input.api, input.generatedDocumentId, {
      pdfUrl: uploaded.url,
      status: 'PDF_GENERATED',
      errorMessage: null,
    });

    return {
      ok: true,
      pdfUrl: uploaded.url,
      bytes: body.byteLength,
      status: 'PDF_GENERATED',
      options,
      errors: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateGeneratedDocument(input.api, input.generatedDocumentId, {
      status: 'FAILED',
      errorMessage: message,
    });
    return {
      ok: false,
      status: 'FAILED',
      options,
      errors: [{
        code: 'PDF_GENERATION_ERROR',
        message,
        userMessage: 'PDF could not be generated. Try again or contact an administrator.',
      }],
    };
  }
};
