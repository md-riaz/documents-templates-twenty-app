import { defineLogicFunction } from 'twenty-sdk/define';
import { jsonSchemaToInputSchema } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { RENDER_TEMPLATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';
import {
  renderTemplateLogic,
  type RenderTemplateLogicOutput,
  type TemplateRepositoryApi,
} from '../logic/render-template';
import type { PermissionPrincipal } from '../permissions/permission-guards';
import {
  WORKFLOW_ACTION_PRINCIPAL,
  createCoreRecordApi,
} from './core-client-adapters';

export type RenderTemplateActionInput = {
  templateId: string;
  primaryObjectType?: string;
  primaryRecordId?: string;
  contextOverrides?: Record<string, unknown>;
  previewData?: Record<string, unknown>;
  strictMissingVariables?: boolean;
};

export type RenderTemplateActionDeps = {
  client?: CoreApiClient;
  api?: TemplateRepositoryApi;
  principal?: PermissionPrincipal;
};

const inputSchema = jsonSchemaToInputSchema({
  type: 'object',
  properties: {
    templateId: { type: 'string', label: 'Template ID' },
    primaryObjectType: { type: 'string', label: 'Primary object type' },
    primaryRecordId: { type: 'string', label: 'Primary record ID' },
    contextOverrides: { type: 'object', label: 'Context overrides' },
    previewData: { type: 'object', label: 'Preview data' },
    strictMissingVariables: { type: 'boolean', label: 'Strict missing variables' },
  },
  required: ['templateId'],
});

const outputSchema = jsonSchemaToInputSchema({
  type: 'object',
  properties: {
    html: { type: 'string', label: 'Rendered HTML' },
    warnings: { type: 'array', items: { type: 'string' }, label: 'Warnings' },
  },
});

export const runRenderTemplate = async (
  input: RenderTemplateActionInput,
  deps: RenderTemplateActionDeps = {},
): Promise<RenderTemplateLogicOutput> => {
  const api = deps.api ?? createCoreRecordApi(deps.client ?? new CoreApiClient());
  return renderTemplateLogic({
    ...input,
    api,
    principal: deps.principal ?? WORKFLOW_ACTION_PRINCIPAL,
  });
};

// NOTE: the Twenty CLI discovers entities via static analysis of the
// `export default defineXxx({...})` expression — it must be inline (not a
// re-exported reference to a named const) or the entity is silently skipped.
export default defineLogicFunction({
  universalIdentifier: RENDER_TEMPLATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'Render Template',
  description: 'Render an active document template into HTML using a record context, context overrides, or preview data.',
  workflowActionTriggerSettings: {
    label: 'Render Template',
    icon: 'IconFileText',
    inputSchema,
    outputSchema,
  },
  handler: (input: RenderTemplateActionInput) => runRenderTemplate(input),
});
