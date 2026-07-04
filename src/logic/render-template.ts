import {
  ContextProviderRegistry,
  loadGenericRecordContext,
  type ContextProviderApi,
  type ContextProviderInput,
  type ContextProviderPermissions,
} from './context/provider-registry';
import type { MetadataApi } from './metadata/metadata-client';
import {
  renderHandlebarsTemplate,
  type RenderHandlebarsTemplateOutput,
} from './rendering/handlebars-renderer';
import {
  assertAnyPermissionScope,
  assertPermissionScope,
  type PermissionPrincipal,
} from '../permissions/permission-guards';

export type LogicErrorCode =
  | 'TEMPLATE_NOT_FOUND'
  | 'TEMPLATE_INACTIVE'
  | 'CONTEXT_REQUIRED'
  | 'TEMPLATE_RENDER_ERROR'
  | string;

export type LogicError = {
  code: LogicErrorCode;
  message: string;
  userMessage: string;
  path?: string;
  line?: number;
  column?: number;
  phase?: string;
};

export type TemplateRepositoryApi = ContextProviderApi & {
  getRecord?: (objectName: string, id: string) => Promise<Record<string, unknown> | null | undefined>;
};

export type RenderTemplateLogicInput = {
  templateId: string;
  primaryObjectType?: string;
  primaryRecordId?: string;
  contextOverrides?: Record<string, unknown>;
  previewData?: Record<string, unknown>;
  strictMissingVariables?: boolean;
  principal?: PermissionPrincipal;
  api?: TemplateRepositoryApi;
  registry?: ContextProviderRegistry;
  permissions?: ContextProviderPermissions;
  currentUser?: Record<string, unknown>;
  workspace?: Record<string, unknown>;
  metadataApi?: MetadataApi;
};

export type RenderTemplateLogicOutput = {
  ok: boolean;
  html: string;
  context: Record<string, unknown>;
  warnings: string[];
  errors: LogicError[];
  template?: {
    id: string;
    name?: string;
  };
};

type DocumentTemplateRecord = {
  id?: string;
  name?: string;
  htmlSource?: string;
  boundObjectName?: string | null;
  status?: string | null;
  isActive?: boolean | null;
};

const errorOutput = (error: LogicError, context: Record<string, unknown> = {}): RenderTemplateLogicOutput => ({
  ok: false,
  html: '',
  context,
  warnings: [],
  errors: [error],
});

const logicError = (code: LogicErrorCode, message: string, userMessage = message): LogicError => ({
  code,
  message,
  userMessage,
});

const isTemplateActive = (template: DocumentTemplateRecord): boolean =>
  template.isActive === true || String(template.status ?? '').toUpperCase() === 'ACTIVE';

const loadTemplate = async (
  api: TemplateRepositoryApi | undefined,
  templateId: string,
): Promise<DocumentTemplateRecord | null> => {
  const record = await api?.getRecord?.('documentTemplate', templateId);
  return (record as DocumentTemplateRecord | null | undefined) ?? null;
};

const buildContext = async (
  input: RenderTemplateLogicInput,
  template: DocumentTemplateRecord,
): Promise<{ context: Record<string, unknown>; warnings: string[] }> => {
  const context = { ...(input.previewData ?? {}) };
  const warnings: string[] = [];

  // `boundObjectName` holds a real Twenty object name (or is empty/null) by
  // construction, so it is safe to use directly as the object type; the ad-hoc
  // `input.primaryObjectType` is the override/fallback for calls not backed by
  // a saved template. A bound template only needs `primaryRecordId` — it must
  // NOT also require `input.primaryObjectType`, or the whole point of binding
  // a template to an object is defeated.
  const effectiveObjectType = template.boundObjectName || input.primaryObjectType;

  if (!input.previewData && (effectiveObjectType || input.primaryRecordId)) {
    if (!effectiveObjectType || !input.primaryRecordId) {
      return {
        context,
        warnings: ['A bound object (from the template) or primaryObjectType, plus primaryRecordId, are required to load record context.'],
      };
    }

    const providerInput: ContextProviderInput = {
      primaryObjectType: effectiveObjectType,
      primaryRecordId: input.primaryRecordId,
      api: input.api,
      permissions: input.permissions,
      currentUser: input.currentUser,
      workspace: input.workspace,
      metadataApi: input.metadataApi,
    };
    // Use the injected registry when provided; otherwise fall back to the
    // metadata-enhanced generic loader that now handles every object (standard
    // or custom) uniformly — no hardcoded per-object providers needed.
    const loaded = input.registry
      ? await input.registry.load(providerInput)
      : await loadGenericRecordContext(providerInput);
    Object.assign(context, loaded.context);
    warnings.push(...loaded.warnings);
  }

  Object.assign(context, input.contextOverrides ?? {});
  return { context, warnings };
};

const mapRenderOutputErrors = (rendered: RenderHandlebarsTemplateOutput): LogicError[] =>
  rendered.errors.map((error) => ({
    code: error.code,
    message: error.message,
    userMessage: error.userMessage,
    path: error.path,
    line: error.line,
    column: error.column,
    phase: error.phase,
  }));

export const renderTemplateLogic = async (input: RenderTemplateLogicInput): Promise<RenderTemplateLogicOutput> => {
  if (input.previewData && !input.primaryRecordId) {
    assertAnyPermissionScope(input.principal, ['viewTemplates', 'generateDocuments']);
  } else {
    assertPermissionScope(input.principal, 'generateDocuments');
  }

  const template = await loadTemplate(input.api, input.templateId);
  if (!template) {
    return errorOutput(logicError(
      'TEMPLATE_NOT_FOUND',
      `Document template not found: ${input.templateId}`,
      'The selected document template could not be found.',
    ));
  }

  const templateSummary = {
    id: template.id ?? input.templateId,
    name: template.name,
  };

  if (!isTemplateActive(template)) {
    return {
      ...errorOutput(logicError(
        'TEMPLATE_INACTIVE',
        `Document template is inactive: ${input.templateId}`,
        'The selected document template is inactive and cannot be rendered.',
      )),
      template: templateSummary,
    };
  }

  if (!template.htmlSource) {
    return {
      ...errorOutput(logicError(
        'TEMPLATE_RENDER_ERROR',
        'Document template has no HTML source.',
        'The selected document template has no HTML source to render.',
      )),
      template: templateSummary,
    };
  }

  const loadedContext = await buildContext(input, template);
  const rendered = renderHandlebarsTemplate({
    htmlSource: template.htmlSource,
    context: loadedContext.context,
    strictMissingVariables: input.strictMissingVariables,
  });
  const errors = mapRenderOutputErrors(rendered);

  return {
    ok: errors.length === 0,
    html: rendered.html,
    context: rendered.context,
    warnings: [...loadedContext.warnings, ...rendered.warnings],
    errors,
    template: templateSummary,
  };
};
