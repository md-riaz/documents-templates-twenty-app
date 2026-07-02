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
  }): Promise<{ url: string; fileId?: string }>;
  attachFileToRecord?(input: {
    objectName: string;
    recordId: string;
    fileId?: string;
    fileUrl: string;
    fileName: string;
    contentType: 'application/pdf';
    metadata?: Record<string, unknown>;
  }): Promise<{ attachmentId?: string }>;
};

export type GeneratedDocumentUpdateApi = {
  updateRecord?: (objectName: string, id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

export type GeneratePdfFromHtmlInput = {
  html: string;
  settings?: PdfSettingsInput;
  workspaceDefaults?: PdfSettingsInput;
  generatedDocumentId?: string;
  sourceObjectName?: string;
  sourceRecordId?: string;
  fileName?: string;
  principal?: PermissionPrincipal;
  adapter?: HtmlToPdfAdapter;
  storage?: PdfStorageAdapter;
  api?: GeneratedDocumentUpdateApi;
  metadata?: Record<string, unknown>;
  now?: Date;
};

export type RecordAttachmentResult = {
  objectName: string;
  recordId: string;
  fileId?: string;
  attachmentId?: string;
};

/** @deprecated Use {@link RecordAttachmentResult}; kept as an alias for existing callers. */
export type SourceRecordAttachmentResult = RecordAttachmentResult;

export type GeneratePdfFromHtmlOutput = {
  ok: boolean;
  /**
   * Best-effort cache of the upload's signed download URL — NOT a durable
   * reference. Twenty signs this URL with an expiry (observed: 24 hours), so
   * a stale `pdfUrl` will 401/404 once the token lapses. The durable way to
   * fetch this PDF later is via `documentAttachment` (the GeneratedDocument's
   * own Attachment, re-signed on every query) rather than this cached string.
   */
  pdfUrl?: string;
  bytes?: number;
  status: 'PDF_GENERATED' | 'FAILED';
  options: BrowserPdfOptions;
  /** Attachment on the CRM record the document was generated from (e.g. a Company). */
  sourceAttachment?: RecordAttachmentResult;
  /**
   * Attachment on the GeneratedDocument audit record itself, so a caller with
   * only a `generatedDocumentId` can retrieve the PDF via that record's
   * built-in Files tab/`attachments` relation — independent of the source
   * record and immune to `pdfUrl`'s signed-URL expiry.
   */
  documentAttachment?: RecordAttachmentResult;
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
    throw new Error('No Puppeteer PDF adapter configured for this runtime. Install puppeteer and configure the adapter in your Twenty server.');
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

const attachPdfToRecord = async (input: {
  storage: PdfStorageAdapter;
  objectName?: string;
  recordId?: string;
  fileId?: string;
  fileUrl: string;
  fileName: string;
  metadata?: Record<string, unknown>;
}): Promise<RecordAttachmentResult | null> => {
  if (!input.objectName || !input.recordId || !input.storage.attachFileToRecord) return null;

  const attached = await input.storage.attachFileToRecord({
    objectName: input.objectName,
    recordId: input.recordId,
    fileId: input.fileId,
    fileUrl: input.fileUrl,
    fileName: input.fileName,
    contentType: 'application/pdf',
    metadata: input.metadata,
  });

  return {
    objectName: input.objectName,
    recordId: input.recordId,
    fileId: input.fileId,
    attachmentId: attached.attachmentId,
  };
};

/**
 * Uploads a fresh copy of the PDF bytes and attaches it to one record. A
 * single uploaded file cannot be attached to two different records — Twenty
 * permanently binds an uploaded file to its first Attachment and rejects a
 * second `createAttachment` call reusing the same `fileId` ("File ... is
 * already associated with a permanent files field", confirmed live) — so
 * attaching to N targets requires N separate uploads, not one shared upload.
 */
const uploadAndAttachToRecord = async (input: {
  storage: PdfStorageAdapter;
  objectName?: string;
  recordId?: string;
  key: string;
  fileName: string;
  body: Uint8Array;
  metadata?: Record<string, unknown>;
}): Promise<{ attachment: RecordAttachmentResult | null; uploaded: { url: string; fileId?: string } | null }> => {
  if (!input.objectName || !input.recordId) {
    return { attachment: null, uploaded: null };
  }

  // Upload happens even if the adapter can't attach (no attachFileToRecord) —
  // attachPdfToRecord itself no-ops in that case, but the caller still needs
  // an uploaded pdfUrl to cache.
  const uploaded = await input.storage.uploadFile({
    key: input.key,
    fileName: input.fileName,
    body: input.body,
    contentType: 'application/pdf',
    metadata: input.metadata,
  });

  const attachment = await attachPdfToRecord({
    storage: input.storage,
    objectName: input.objectName,
    recordId: input.recordId,
    fileId: uploaded.fileId,
    fileUrl: uploaded.url,
    fileName: input.fileName,
    metadata: input.metadata,
  });

  return { attachment, uploaded };
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
    const attachmentMetadata = {
      ...(input.metadata ?? {}),
      generatedDocumentId: input.generatedDocumentId ?? null,
    };

    const hasSourceTarget = Boolean(input.sourceObjectName && input.sourceRecordId);
    const hasDocumentTarget = Boolean(input.generatedDocumentId);

    // Each Attachment target needs its own dedicated upload — Twenty
    // permanently binds an uploaded file to the first Attachment it's
    // attached to, so a single shared fileId cannot back two Attachments
    // (confirmed live: reusing one fails with "File ... is already
    // associated with a permanent files field"). When there's no attach
    // target at all, fall back to a single plain upload just to produce a
    // pdfUrl.
    let sourceUpload: { url: string; fileId?: string } | null = null;
    let documentUpload: { url: string; fileId?: string } | null = null;
    let sourceAttachment: RecordAttachmentResult | null = null;
    let documentAttachment: RecordAttachmentResult | null = null;

    if (!hasSourceTarget && !hasDocumentTarget) {
      documentUpload = await storage.uploadFile({ key, fileName, body, contentType: 'application/pdf', metadata: attachmentMetadata });
    } else {
      const [sourceResult, documentResult] = await Promise.all([
        hasSourceTarget
          ? uploadAndAttachToRecord({ storage, objectName: input.sourceObjectName, recordId: input.sourceRecordId, key, fileName, body, metadata: attachmentMetadata })
          : null,
        hasDocumentTarget
          ? uploadAndAttachToRecord({ storage, objectName: 'generatedDocument', recordId: input.generatedDocumentId, key, fileName, body, metadata: attachmentMetadata })
          : null,
      ]);
      sourceUpload = sourceResult?.uploaded ?? null;
      sourceAttachment = sourceResult?.attachment ?? null;
      documentUpload = documentResult?.uploaded ?? null;
      documentAttachment = documentResult?.attachment ?? null;
    }

    // pdfUrl is a best-effort cache of ONE of the uploads' signed URLs —
    // prefer the GeneratedDocument's own upload (retrievable durably later
    // via its Files tab/`attachments` relation) over the source record's.
    const cachedUpload = documentUpload ?? sourceUpload;
    if (!cachedUpload) throw new Error('PDF was rendered but no upload target was configured or reachable.');

    await updateGeneratedDocument(input.api, input.generatedDocumentId, {
      pdfUrl: cachedUpload.url,
      status: 'PDF_GENERATED',
      errorMessage: null,
      ...(sourceAttachment || documentAttachment ? {
        metadata: {
          ...(input.metadata ?? {}),
          ...(sourceAttachment ? { sourceAttachment } : {}),
          ...(documentAttachment ? { documentAttachment } : {}),
        },
      } : {}),
    });

    return {
      ok: true,
      pdfUrl: cachedUpload.url,
      bytes: body.byteLength,
      status: 'PDF_GENERATED',
      options,
      sourceAttachment: sourceAttachment ?? undefined,
      documentAttachment: documentAttachment ?? undefined,
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
