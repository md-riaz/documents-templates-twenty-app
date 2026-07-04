import { defineLogicFunction } from 'twenty-sdk/define';
import { jsonSchemaToInputSchema } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { SAVE_DOCUMENT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';
import {
  saveDocumentLogic,
  type DocumentRepositoryApi,
  type DocumentStatus,
} from '../logic/save-document';
import type { PermissionPrincipal } from '../permissions/permission-guards';
import {
  WORKFLOW_ACTION_PRINCIPAL,
  createCoreRecordApi,
} from './core-client-adapters';

export type SaveDocumentActionInput = {
  templateId: string;
  primaryObjectType?: string;
  primaryRecordId?: string;
  renderedHtml: string;
  pdfUrl?: string | null;
  status?: DocumentStatus;
  metadata?: Record<string, unknown>;
};

export type SaveDocumentActionOutput = {
  documentId?: string;
  pdfUrl?: string | null;
};

export type SaveDocumentActionDeps = {
  client?: CoreApiClient;
  api?: DocumentRepositoryApi;
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
    documentId: { type: 'string', label: 'Document ID' },
    pdfUrl: { type: 'string', label: 'PDF URL' },
  },
});

export const runSaveDocument = async (
  input: SaveDocumentActionInput,
  deps: SaveDocumentActionDeps = {},
): Promise<SaveDocumentActionOutput> => {
  const api = deps.api ?? createCoreRecordApi(deps.client ?? new CoreApiClient());
  const saved = await saveDocumentLogic({
    ...input,
    api,
    principal: deps.principal ?? WORKFLOW_ACTION_PRINCIPAL,
  });

  if (!saved.ok) {
    // Throw so the workflow step actually surfaces as failed, rather than
    // returning a success-shaped output with an undefined documentId — the
    // audit record was never created, and the workflow author needs to see
    // that, not a silently "successful" step.
    const message = saved.errors.map((error) => error.userMessage || error.message).join('; ') || 'Failed to save document.';
    throw new Error(message);
  }

  return {
    documentId: saved.id,
    pdfUrl: input.pdfUrl ?? undefined,
  };
};

// NOTE: the Twenty CLI discovers entities via static analysis of the
// `export default defineXxx({...})` expression — it must be inline (not a
// re-exported reference to a named const) or the entity is silently skipped.
export default defineLogicFunction({
  universalIdentifier: SAVE_DOCUMENT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'Save Document',
  description: 'Persist rendered workflow output as a Document record, including the PDF URL and status.',
  workflowActionTriggerSettings: {
    label: 'Save Document',
    icon: 'IconDatabaseImport',
    inputSchema,
    outputSchema,
  },
  handler: (input: SaveDocumentActionInput) => runSaveDocument(input),
});
