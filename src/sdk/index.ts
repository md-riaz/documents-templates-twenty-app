import {
  createContextProviderRegistry,
  registerContextProvider as registerContextProviderInRegistry,
  type ContextProvider,
} from '../logic/context/provider-registry';
import { generatePdfFromHtmlLogic } from '../logic/generate-pdf';
import { renderTemplateLogic } from '../logic/render-template';
import { sendTemplatedEmailLogic } from '../logic/send-templated-email';
import { assertAnyPermissionScope } from '../permissions/permission-guards';
import type {
  DocumentsTemplatesSdk,
  DocumentsTemplatesSdkRuntime,
  GeneratePdfFromHtmlSdkInput,
  ListTemplatesInput,
  RenderTemplateSdkInput,
  SendTemplatedEmailSdkInput,
  TemplateSummary,
} from './types';

const withRuntimeDefaults = (runtime: DocumentsTemplatesSdkRuntime = {}): DocumentsTemplatesSdkRuntime => ({
  ...runtime,
  registry: runtime.registry ?? createContextProviderRegistry({ includeDefaultProviders: true }),
});

export const renderTemplate = (input: RenderTemplateSdkInput, runtime: DocumentsTemplatesSdkRuntime = {}) => {
  const resolved = withRuntimeDefaults(runtime);
  return renderTemplateLogic({
    ...input,
    principal: resolved.principal,
    api: resolved.api,
    registry: resolved.registry,
    currentUser: resolved.currentUser,
    workspace: resolved.workspace,
  });
};

export const generatePdfFromHtml = (input: GeneratePdfFromHtmlSdkInput, runtime: DocumentsTemplatesSdkRuntime = {}) => {
  const resolved = withRuntimeDefaults(runtime);
  return generatePdfFromHtmlLogic({
    ...input,
    principal: resolved.principal,
    api: resolved.api,
  });
};

export const sendTemplatedEmail = (input: SendTemplatedEmailSdkInput, runtime: DocumentsTemplatesSdkRuntime = {}) => {
  const resolved = withRuntimeDefaults(runtime);
  return sendTemplatedEmailLogic({
    ...input,
    principal: resolved.principal,
    api: resolved.api,
    currentUser: resolved.currentUser,
  });
};

const stringOrUndefined = (value: unknown): string | undefined => typeof value === 'string' ? value : undefined;
const booleanOrUndefined = (value: unknown): boolean | undefined => typeof value === 'boolean' ? value : undefined;
const numberOrUndefined = (value: unknown): number | undefined => typeof value === 'number' ? value : undefined;

const toTemplateSummary = (record: Record<string, unknown>): TemplateSummary => ({
  id: stringOrUndefined(record.id) ?? '',
  name: stringOrUndefined(record.name) ?? 'Untitled template',
  slug: stringOrUndefined(record.slug),
  status: stringOrUndefined(record.status),
  isActive: booleanOrUndefined(record.isActive),
  renderer: stringOrUndefined(record.renderer),
  defaultSubject: stringOrUndefined(record.defaultSubject),
  category: record.category,
  version: numberOrUndefined(record.version),
});

const fallbackListTemplates = async (input: ListTemplatesInput, runtime: DocumentsTemplatesSdkRuntime): Promise<TemplateSummary[]> => {
  if (!input.search) return [];
  const maybeRecord = await runtime.api?.getRecord?.('documentTemplate', input.search);
  if (!maybeRecord) return [];
  return [toTemplateSummary(maybeRecord)];
};

export const listTemplates = async (
  input: ListTemplatesInput = {},
  runtime: DocumentsTemplatesSdkRuntime = {},
): Promise<TemplateSummary[]> => {
  const resolved = withRuntimeDefaults(runtime);
  assertAnyPermissionScope(resolved.principal, ['viewTemplates', 'manageTemplates', 'generateDocuments']);

  const records = await resolved.api?.listRecords?.('documentTemplate', input);
  const summaries = records ? records.map(toTemplateSummary) : await fallbackListTemplates(input, resolved);
  return summaries.filter((template) => {
    if (input.activeOnly && template.isActive === false) return false;
    if (input.search) {
      const query = input.search.toLowerCase();
      return template.id.toLowerCase().includes(query)
        || template.name.toLowerCase().includes(query)
        || (template.slug?.toLowerCase().includes(query) ?? false);
    }
    return true;
  }).slice(0, input.limit ?? summaries.length);
};

export const registerContextProvider = (
  name: string,
  provider: ContextProvider,
  runtime: DocumentsTemplatesSdkRuntime = {},
): void => {
  const resolved = withRuntimeDefaults(runtime);
  registerContextProviderInRegistry(name, provider, resolved.registry);
  runtime.registry = resolved.registry;
};

export const createDocumentsTemplatesSdk = (runtime: DocumentsTemplatesSdkRuntime = {}): DocumentsTemplatesSdk => {
  const resolved = withRuntimeDefaults(runtime);
  return {
    runtime: resolved,
    renderTemplate(input) {
      return renderTemplate(input, resolved);
    },
    generatePdfFromHtml(input) {
      return generatePdfFromHtml(input, resolved);
    },
    sendTemplatedEmail(input) {
      return sendTemplatedEmail(input, resolved);
    },
    listTemplates(input) {
      return listTemplates(input, resolved);
    },
  };
};

export type {
  DocumentsTemplatesSdk,
  DocumentsTemplatesSdkApi,
  DocumentsTemplatesSdkRuntime,
  GeneratePdfFromHtmlSdkInput,
  ListTemplatesInput,
  RenderTemplateSdkInput,
  SendTemplatedEmailSdkInput,
  TemplateSummary,
} from './types';
