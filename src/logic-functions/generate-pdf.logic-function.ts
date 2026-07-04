import { defineLogicFunction } from 'twenty-sdk/define';
import { jsonSchemaToInputSchema } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { GENERATE_PDF_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';
import { createPdfAdapter } from '../adapters/pdf.adapter';
import {
  generatePdfFromHtmlLogic,
  type DocumentUpdateApi,
  type HtmlToPdfAdapter,
  type PdfStorageAdapter,
} from '../logic/generate-pdf';
import type { PdfSettingsInput } from '../logic/settings/pdf-settings';
import type { PermissionPrincipal } from '../permissions/permission-guards';
import {
  WORKFLOW_ACTION_PRINCIPAL,
  createCoreRecordApi,
  createCoreStorageAdapter,
} from './core-client-adapters';

export type GeneratePdfActionInput = {
  html: string;
  settings?: PdfSettingsInput;
  fileName?: string;
  documentId?: string;
  metadata?: Record<string, unknown>;
};

export type GeneratePdfActionOutput = {
  /** Best-effort cache of a signed download URL that expires (~24h) — prefer documentAttachmentId for durable retrieval. */
  pdfUrl?: string;
  /** Attachment on the Document record itself; fetch via its Files tab/`attachments` relation using only a documentId. */
  documentAttachmentId?: string;
  status: 'PDF_GENERATED' | 'FAILED';
};

export type GeneratePdfActionDeps = {
  client?: CoreApiClient;
  adapter?: HtmlToPdfAdapter;
  storage?: PdfStorageAdapter;
  api?: DocumentUpdateApi;
  principal?: PermissionPrincipal;
};

const inputSchema = jsonSchemaToInputSchema({
  type: 'object',
  properties: {
    html: { type: 'string', multiline: true, label: 'HTML' },
    settings: { type: 'object', label: 'PDF settings' },
    fileName: { type: 'string', label: 'File name' },
    documentId: { type: 'string', label: 'Document ID' },
  },
  required: ['html'],
});

const outputSchema = jsonSchemaToInputSchema({
  type: 'object',
  properties: {
    pdfUrl: { type: 'string', label: 'PDF URL' },
    documentAttachmentId: { type: 'string', label: 'Document Attachment ID' },
    status: { type: 'string', label: 'Status' },
  },
});

export const runGeneratePdf = async (
  input: GeneratePdfActionInput,
  deps: GeneratePdfActionDeps = {},
): Promise<GeneratePdfActionOutput> => {
  let cachedClient: CoreApiClient | undefined = deps.client;
  const resolveClient = (): CoreApiClient => (cachedClient ??= new CoreApiClient());
  let cachedMetadataClient: MetadataApiClient | undefined;
  const resolveMetadataClient = (): MetadataApiClient => (cachedMetadataClient ??= new MetadataApiClient());

  const adapter = deps.adapter ?? createPdfAdapter();
  const storage = deps.storage ?? createCoreStorageAdapter(resolveClient(), resolveMetadataClient());
  const api = deps.api ?? createCoreRecordApi(resolveClient());

  const result = await generatePdfFromHtmlLogic({
    html: input.html,
    settings: input.settings,
    fileName: input.fileName,
    documentId: input.documentId,
    metadata: input.metadata,
    adapter,
    storage,
    api,
    principal: deps.principal ?? WORKFLOW_ACTION_PRINCIPAL,
  });

  return {
    pdfUrl: result.pdfUrl,
    documentAttachmentId: result.documentAttachment?.attachmentId,
    status: result.status,
  };
};

// NOTE: the Twenty CLI discovers entities via static analysis of the
// `export default defineXxx({...})` expression — it must be inline (not a
// re-exported reference to a named const) or the entity is silently skipped.
export default defineLogicFunction({
  universalIdentifier: GENERATE_PDF_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'Generate PDF',
  description: 'Render HTML into a PDF, upload it to Twenty file storage, and attach it to the Document record.',
  workflowActionTriggerSettings: {
    label: 'Generate PDF',
    icon: 'IconFilePdf',
    inputSchema,
    outputSchema,
  },
  handler: (input: GeneratePdfActionInput) => runGeneratePdf(input),
});
