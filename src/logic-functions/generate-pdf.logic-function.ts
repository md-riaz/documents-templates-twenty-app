import { defineLogicFunction } from 'twenty-sdk/define';
import { jsonSchemaToInputSchema } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { GENERATE_PDF_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';
import { createPdfAdapter } from '../adapters/pdf.adapter';
import {
  generatePdfFromHtmlLogic,
  type GeneratedDocumentUpdateApi,
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
  sourceObjectName?: string;
  sourceRecordId?: string;
  fileName?: string;
  generatedDocumentId?: string;
  metadata?: Record<string, unknown>;
};

export type GeneratePdfActionOutput = {
  pdfUrl?: string;
  attachmentId?: string;
  status: 'PDF_GENERATED' | 'FAILED';
};

export type GeneratePdfActionDeps = {
  client?: CoreApiClient;
  adapter?: HtmlToPdfAdapter;
  storage?: PdfStorageAdapter;
  api?: GeneratedDocumentUpdateApi;
  principal?: PermissionPrincipal;
};

const inputSchema = jsonSchemaToInputSchema({
  type: 'object',
  properties: {
    html: { type: 'string', multiline: true, label: 'HTML' },
    settings: { type: 'object', label: 'PDF settings' },
    sourceObjectName: { type: 'string', label: 'Source object name' },
    sourceRecordId: { type: 'string', label: 'Source record ID' },
    fileName: { type: 'string', label: 'File name' },
    generatedDocumentId: { type: 'string', label: 'Generated document ID' },
  },
  required: ['html'],
});

const outputSchema = jsonSchemaToInputSchema({
  type: 'object',
  properties: {
    pdfUrl: { type: 'string', label: 'PDF URL' },
    attachmentId: { type: 'string', label: 'Attachment ID' },
    status: { type: 'string', label: 'Status' },
  },
});

export const runGeneratePdf = async (
  input: GeneratePdfActionInput,
  deps: GeneratePdfActionDeps = {},
): Promise<GeneratePdfActionOutput> => {
  let cachedClient: CoreApiClient | undefined = deps.client;
  const resolveClient = (): CoreApiClient => (cachedClient ??= new CoreApiClient());

  const adapter = deps.adapter ?? createPdfAdapter();
  const storage = deps.storage ?? createCoreStorageAdapter(resolveClient());
  const api = deps.api ?? createCoreRecordApi(resolveClient());

  const result = await generatePdfFromHtmlLogic({
    html: input.html,
    settings: input.settings,
    sourceObjectName: input.sourceObjectName,
    sourceRecordId: input.sourceRecordId,
    fileName: input.fileName,
    generatedDocumentId: input.generatedDocumentId,
    metadata: input.metadata,
    adapter,
    storage,
    api,
    principal: deps.principal ?? WORKFLOW_ACTION_PRINCIPAL,
  });

  return {
    pdfUrl: result.pdfUrl,
    attachmentId: result.sourceAttachment?.attachmentId,
    status: result.status,
  };
};

// NOTE: the Twenty CLI discovers entities via static analysis of the
// `export default defineXxx({...})` expression — it must be inline (not a
// re-exported reference to a named const) or the entity is silently skipped.
export default defineLogicFunction({
  universalIdentifier: GENERATE_PDF_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'Generate PDF',
  description: 'Render HTML into a PDF, upload it to Twenty file storage, and optionally attach it to a source record.',
  workflowActionTriggerSettings: {
    label: 'Generate PDF',
    icon: 'IconFilePdf',
    inputSchema,
    outputSchema,
  },
  handler: (input: GeneratePdfActionInput) => runGeneratePdf(input),
});
