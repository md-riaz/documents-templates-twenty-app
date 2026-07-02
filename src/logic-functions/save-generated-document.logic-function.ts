import { defineLogicFunction } from 'twenty-sdk/define';
import { jsonSchemaToInputSchema } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { SAVE_GENERATED_DOCUMENT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';
import {
  saveGeneratedDocumentLogic,
  type GeneratedDocumentRepositoryApi,
  type GeneratedDocumentStatus,
} from '../logic/save-generated-document';
import type { PermissionPrincipal } from '../permissions/permission-guards';
import {
  WORKFLOW_ACTION_PRINCIPAL,
  createCoreRecordApi,
} from './core-client-adapters';

export type SaveGeneratedDocumentActionInput = {
  templateId: string;
  primaryObjectType?: string;
  primaryRecordId?: string;
  renderedHtml: string;
  pdfUrl?: string | null;
  status?: GeneratedDocumentStatus;
  metadata?: Record<string, unknown>;
};

export type SaveGeneratedDocumentActionOutput = {
  generatedDocumentId?: string;
  pdfUrl?: string | null;
};

export type SaveGeneratedDocumentActionDeps = {
  client?: CoreApiClient;
  api?: GeneratedDocumentRepositoryApi;
  principal?: PermissionPrincipal;
};

const inputSchema = jsonSchemaToInputSchema({
  type: 'object',
  properties: {
    templateId: { type: 'string', label: 'Template ID' },
    primaryObjectType: { type: 'string', label: 'Primary object type' },
    primaryRecordId: { type: 'string', label: 'Primary record ID' },
    renderedHtml: { type: 'string', multiline: true, label: 'Rendered HTML' },
    pdfUrl: { type: 'string', label: 'PDF URL' },
    status: { type: 'string', label: 'Status' },
    metadata: { type: 'object', label: 'Metadata' },
  },
  required: ['templateId', 'renderedHtml'],
});

const outputSchema = jsonSchemaToInputSchema({
  type: 'object',
  properties: {
    generatedDocumentId: { type: 'string', label: 'Generated document ID' },
    pdfUrl: { type: 'string', label: 'PDF URL' },
  },
});

export const runSaveGeneratedDocument = async (
  input: SaveGeneratedDocumentActionInput,
  deps: SaveGeneratedDocumentActionDeps = {},
): Promise<SaveGeneratedDocumentActionOutput> => {
  const api = deps.api ?? createCoreRecordApi(deps.client ?? new CoreApiClient());
  const saved = await saveGeneratedDocumentLogic({
    ...input,
    api,
    principal: deps.principal ?? WORKFLOW_ACTION_PRINCIPAL,
  });

  return {
    generatedDocumentId: saved.id,
    pdfUrl: input.pdfUrl ?? undefined,
  };
};

// NOTE: the Twenty CLI discovers entities via static analysis of the
// `export default defineXxx({...})` expression — it must be inline (not a
// re-exported reference to a named const) or the entity is silently skipped.
export default defineLogicFunction({
  universalIdentifier: SAVE_GENERATED_DOCUMENT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'Save Generated Document',
  description: 'Persist rendered workflow output as a GeneratedDocument record, including the PDF URL and status.',
  workflowActionTriggerSettings: {
    label: 'Save Generated Document',
    icon: 'IconDatabaseImport',
    inputSchema,
    outputSchema,
  },
  handler: (input: SaveGeneratedDocumentActionInput) => runSaveGeneratedDocument(input),
});
