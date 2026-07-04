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

export type DocumentUpdateApi = {
  updateRecord?: (objectName: string, id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

export type GeneratePdfFromHtmlInput = {
  html: string;
  settings?: PdfSettingsInput;
  workspaceDefaults?: PdfSettingsInput;
  documentId?: string;
  fileName?: string;
  principal?: PermissionPrincipal;
  adapter?: HtmlToPdfAdapter;
  storage?: PdfStorageAdapter;
  api?: DocumentUpdateApi;
  metadata?: Record<string, unknown>;
  now?: Date;
};

export type RecordAttachmentResult = {
  objectName: string;
  recordId: string;
  fileId?: string;
  attachmentId?: string;
};

export type GeneratePdfFromHtmlOutput = {
  ok: boolean;
  /**
   * Best-effort cache of the upload's signed download URL — NOT a durable
   * reference. Twenty signs this URL with an expiry (observed: 24 hours), so
   * a stale `pdfUrl` will 401/404 once the token lapses. The durable way to
   * fetch this PDF later is via `documentAttachment` (the Document record's
   * own Attachment, re-signed on every query) rather than this cached string.
   */
  pdfUrl?: string;
  bytes?: number;
  status: 'PDF_GENERATED' | 'FAILED';
  options: BrowserPdfOptions;
  /**
   * Attachment on the Document audit record itself, so a caller with only a
   * `documentId` can retrieve the PDF via that record's built-in Files
   * tab/`attachments` relation — immune to `pdfUrl`'s signed-URL expiry.
   * The PDF is attached ONLY here (not also to the source CRM record) — the
   * source record reaches it via the existing "Documents" tab's link to this
   * Document record, avoiding a duplicate upload/attachment for the same file.
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

export const createPdfStorageKey = (input: { documentId?: string; fileName?: string; now?: Date }): string => {
  const now = input.now ?? new Date();
  const ownerSegment = safeSegment(input.documentId, 'unsaved');
  const fileSegment = slugify(input.fileName ?? '', 'document');
  return `documents/${ownerSegment}/${timestampForKey(now)}-${fileSegment}.pdf`;
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

const updateDocument = async (
  api: DocumentUpdateApi | undefined,
  documentId: string | undefined,
  data: Record<string, unknown>,
): Promise<void> => {
  if (documentId) {
    await api?.updateRecord?.('document', documentId, data);
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
  if (!input.objectName || !input.recordId) return null;
  if (!input.storage.attachFileToRecord) {
    throw new Error(`PDF was uploaded but could not be attached to ${input.objectName}: no attach adapter configured.`);
  }

  const attached = await input.storage.attachFileToRecord({
    objectName: input.objectName,
    recordId: input.recordId,
    fileId: input.fileId,
    fileUrl: input.fileUrl,
    fileName: input.fileName,
    contentType: 'application/pdf',
    metadata: input.metadata,
  });

  if (!attached.attachmentId) {
    throw new Error(`PDF was uploaded but Twenty did not return an attachment id for ${input.objectName}.`);
  }

  return {
    objectName: input.objectName,
    recordId: input.recordId,
    fileId: input.fileId,
    attachmentId: attached.attachmentId,
  };
};

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
  const safeBaseName = slugify(input.fileName ?? 'document', 'document');
  const documentPrefix = input.documentId ? `document-${safeSegment(input.documentId, 'unsaved')}` : 'document';
  const fileName = `${documentPrefix}-${safeBaseName}.pdf`;
  const key = createPdfStorageKey({ documentId: input.documentId, fileName: safeBaseName, now });

  try {
    const body = await adapter.renderHtmlToPdf({ html: input.html, options });
    const attachmentMetadata = {
      ...(input.metadata ?? {}),
      documentId: input.documentId ?? null,
    };

    // Attach only to the Document record itself — not also to the source CRM
    // record. A single uploaded file cannot be attached to two different
    // records anyway (Twenty permanently binds an uploaded file to its first
    // Attachment and rejects reusing the same fileId, confirmed live: "File
    // ... is already associated with a permanent files field"), and the
    // source record already reaches this file via the existing "Documents"
    // tab's link to this Document record — attaching there too would just be
    // a second, redundant upload of the same content. When there's no
    // Document target at all (e.g. a bare `generatePdfFromHtml` call with no
    // persistence), fall back to a plain upload just to produce a `pdfUrl`.
    let documentUpload: { url: string; fileId?: string } | null = null;
    let documentAttachment: RecordAttachmentResult | null = null;

    if (input.documentId) {
      const result = await uploadAndAttachToRecord({ storage, objectName: 'document', recordId: input.documentId, key, fileName, body, metadata: attachmentMetadata });
      documentUpload = result.uploaded;
      documentAttachment = result.attachment;
    } else {
      documentUpload = await storage.uploadFile({ key, fileName, body, contentType: 'application/pdf', metadata: attachmentMetadata });
    }

    if (!documentUpload) throw new Error('PDF was rendered but no upload target was configured or reachable.');

    await updateDocument(input.api, input.documentId, {
      pdfUrl: documentUpload.url,
      status: 'PDF_GENERATED',
      errorMessage: null,
      ...(documentAttachment ? {
        metadata: {
          ...(input.metadata ?? {}),
          documentAttachment,
        },
      } : {}),
    });

    return {
      ok: true,
      pdfUrl: documentUpload.url,
      bytes: body.byteLength,
      status: 'PDF_GENERATED',
      options,
      documentAttachment: documentAttachment ?? undefined,
      errors: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateDocument(input.api, input.documentId, {
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
