import type { ContextProviderApi, ContextProviderRegistry } from '../logic/context/provider-registry';
import type { GeneratedDocumentUpdateApi, GeneratePdfFromHtmlInput, GeneratePdfFromHtmlOutput } from '../logic/generate-pdf';
import type { RenderTemplateLogicInput, RenderTemplateLogicOutput, TemplateRepositoryApi } from '../logic/render-template';
import type { PermissionPrincipal } from '../permissions/permission-guards';

export type DocumentsTemplatesSdkRuntime = {
  principal?: PermissionPrincipal;
  api?: DocumentsTemplatesSdkApi;
  registry?: ContextProviderRegistry;
  currentUser?: Record<string, unknown>;
  workspace?: Record<string, unknown>;
};

export type DocumentsTemplatesSdkApi = TemplateRepositoryApi & GeneratedDocumentUpdateApi & ContextProviderApi & {
  listRecords?: (objectName: string, options?: ListTemplatesInput) => Promise<Record<string, unknown>[]>;
};

export type RenderTemplateSdkInput = Omit<RenderTemplateLogicInput, 'principal' | 'api' | 'registry' | 'currentUser' | 'workspace'>;
export type GeneratePdfFromHtmlSdkInput = Omit<GeneratePdfFromHtmlInput, 'principal' | 'api'>;

export type ListTemplatesInput = {
  activeOnly?: boolean;
  search?: string;
  categoryId?: string;
  provider?: string;
  renderer?: string;
  limit?: number;
};

export type TemplateSummary = {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  isActive?: boolean;
  renderer?: string;
  category?: unknown;
  version?: number;
};

export type DocumentsTemplatesSdk = {
  runtime: DocumentsTemplatesSdkRuntime;
  renderTemplate(input: RenderTemplateSdkInput): Promise<RenderTemplateLogicOutput>;
  generatePdfFromHtml(input: GeneratePdfFromHtmlSdkInput): Promise<GeneratePdfFromHtmlOutput>;
  listTemplates(input?: ListTemplatesInput): Promise<TemplateSummary[]>;
};
