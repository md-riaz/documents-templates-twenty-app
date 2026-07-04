export { default as applicationConfig } from './application-config';
export { default as defaultRole } from './default-role';
export { default as documentTemplateObject } from './objects/document-template.object';
export { default as templateCategoryObject } from './objects/template-category.object';
export { default as templateVersionObject } from './objects/template-version.object';
export { default as documentObject } from './objects/document.object';
export { default as documentTemplateView } from './menu/document-template.view';
export { default as documentView } from './menu/document.view';
export { default as documentsTemplatesNavigationMenuItem } from './menu/documents-templates.navigation-menu-item';
export { default as documentsTemplatesNavigationFolder } from './menu/documents-templates-folder.navigation-menu-item';
export { default as documentsNavigationMenuItem } from './menu/documents.navigation-menu-item';
export {
  default as documentShellFrontComponent,
  DocumentShellComponent,
  type DocumentShellComponentProps,
} from './front-components/document-shell.front-component';
export {
  TemplateEditorComponent,
  TemplateEditorController,
  VariablePicker,
  createLocalPreviewTemplateEditorApi,
  createTemplateEditorState,
  groupVariablesForPicker,
  insertVariableExpression,
  mergeTemplateVariables,
  renderTemplateEditorMarkup,
  templateEditorFrontComponent,
  validateTemplateEditorState,
  type TemplateEditorApi,
  type TemplateEditorComponentProps,
  type TemplateEditorState,
  type TemplateEditorTab,
  type TemplateEditorTemplate,
  type TemplateEditorVariable,
  type VariableGroup,
  type VariablePickerProps,
} from './front-components/template-editor.front-component';
export {
  GenerateDocumentComponent,
  GenerateDocumentController,
  createGenerateDocumentState,
  createUnavailableGenerateDocumentApi,
  filterDocumentHistory,
  generateDocumentFrontComponent,
  documentHistoryFrontComponent,
  isGenerateDocumentActionVisible,
  renderDocumentHistoryMarkup,
  renderGenerateDocumentModalMarkup,
  type DocumentHistoryRecord,
  type GenerateDocumentApi,
  type GenerateDocumentComponentProps,
  type GenerateDocumentState,
  type GenerateDocumentTemplate,
} from './front-components/generate-document.front-component';
export {
  PdfSettingsFields,
  createPdfSettingsState,
  pdfSettingsFrontComponent,
  renderPdfSettingsMarkup,
  validatePdfSettingsState,
  type PdfSettingsFieldsProps,
  type PdfSettingsState,
} from './front-components/pdf-settings.front-component';
export {
  companyDocumentsPageLayoutTab,
  documentsStandardRecordTabs,
  opportunityDocumentsPageLayoutTab,
  personDocumentsPageLayoutTab,
} from './page-layout-tabs/documents-standard-record-tabs';
export { default as documentTemplatePageLayout } from './page-layouts/document-template.page-layout';
export { default as documentTemplateFieldsTab } from './page-layout-tabs/document-template-fields.page-layout-tab';
export { default as documentTemplateEditorTab } from './page-layout-tabs/document-template-editor.page-layout-tab';
export { default as generateDocumentCommandMenuItem } from './menu/generate-document.command-menu-item';
export {
  ContextProviderRegistry,
  createContextProviderRegistry,
  defaultContextProviderRegistry,
  loadGenericRecordContext,
  registerContextProvider,
  type ContextProvider,
  type ContextProviderInput,
  type ContextProviderResult,
} from './logic/context/provider-registry';
export {
  createCachedMetadataApi,
  createMetadataApi,
  type CachedMetadataApiOptions,
  type MetadataApi,
  type MetadataObject,
  type MetadataObjectField,
  type MetadataQueryClient,
} from './logic/metadata/metadata-client';
export {
  DOCUMENTS_TEMPLATES_PERMISSION_SCOPES,
  PERMISSION_SCOPE_LABELS,
  type DocumentsTemplatesPermissionScope,
} from './permissions/scopes';
export {
  PermissionDeniedError,
  assertAnyPermissionScope,
  assertPermissionScope,
  hasPermissionScope,
  isDocumentsTemplatesPermissionScope,
  type PermissionPrincipal,
} from './permissions/permission-guards';
export {
  escapeHtml,
  renderHandlebarsTemplate,
  type RenderHandlebarsTemplateInput,
  type RenderHandlebarsTemplateOutput,
} from './logic/rendering/handlebars-renderer';
export {
  createDefaultHelperRegistry,
  createHelperRegistry,
  type HelperRegistry,
  type TemplateContext,
  type TemplateHelper,
} from './logic/rendering/helper-registry';
export {
  extractReferencedVariables,
  validateHandlebarsTemplate,
  type TemplateValidationOptions,
  type TemplateValidationResult,
} from './logic/rendering/template-validation';
export {
  TemplateRenderError,
  mapTemplateRenderError,
  type TemplateErrorCode,
  type TemplateRenderErrorDetails,
} from './logic/rendering/render-errors';
export {
  renderTemplateLogic,
  type LogicError,
  type LogicErrorCode,
  type RenderTemplateLogicInput,
  type RenderTemplateLogicOutput,
  type TemplateRepositoryApi,
} from './logic/render-template';
export {
  validateTemplateLogic,
  type ValidateTemplateInput,
  type ValidateTemplateOutput,
} from './logic/validate-template';
export {
  listBoundObjectFields,
  listTemplateVariablesLogic,
  type ListTemplateVariablesInput,
  type TemplateVariableInfo,
} from './logic/list-template-variables';
export {
  buildDocumentRecord,
  saveDocumentLogic,
  type DocumentRepositoryApi,
  type DocumentStatus,
  type SaveDocumentInput,
  type SaveDocumentOutput,
} from './logic/save-document';
export {
  DEFAULT_PDF_SETTINGS,
  mapPdfSettingsToBrowserOptions,
  normalizePdfSettings,
  validatePdfSettings,
  type BrowserPdfOptions,
  type PdfSettings,
  type PdfSettingsInput,
} from './logic/settings/pdf-settings';
export {
  createPdfStorageKey,
  generatePdfFromHtmlLogic,
  type DocumentUpdateApi,
  type GeneratePdfFromHtmlInput,
  type GeneratePdfFromHtmlOutput,
  type HtmlToPdfAdapter,
  type PdfStorageAdapter,
  type RecordAttachmentResult,
} from './logic/generate-pdf';
export {
  createPdfAdapter,
  pdfAdapter,
} from './adapters/pdf.adapter';
export {
  ACCEPTANCE_SCENARIOS,
  renderRtlSmokeFixture,
  runAcceptanceScenario,
  sanitizeDocumentHtml,
  validateDocumentAuditTrail,
  type AcceptanceContext,
  type AcceptanceScenario,
  type AcceptanceScenarioId,
} from './logic/acceptance-hardening';
export {
  runGeneratePdf,
  type GeneratePdfActionDeps,
  type GeneratePdfActionInput,
  type GeneratePdfActionOutput,
} from './logic-functions/generate-pdf.logic-function';
export {
  runRenderTemplate,
  type RenderTemplateActionDeps,
  type RenderTemplateActionInput,
} from './logic-functions/render-template.logic-function';
export {
  runSaveDocument,
  type SaveDocumentActionDeps,
  type SaveDocumentActionInput,
  type SaveDocumentActionOutput,
} from './logic-functions/save-document.logic-function';
export {
  runSeedStarterTemplates,
  type SeedStarterTemplatesInput,
  type SeedStarterTemplatesOutput,
} from './logic-functions/seed-starter-templates.logic-function';
export {
  starterTemplates,
  type StarterTemplateDefinition,
} from './seed/starter-templates';
export {
  WORKFLOW_ACTION_PRINCIPAL,
  createCoreRecordApi,
  createCoreStorageAdapter,
  type CoreRecordApi,
  type GenqlClientLike,
  type GenqlRequest,
} from './logic-functions/core-client-adapters';
export {
  createDocumentsTemplatesSdk,
  generatePdfFromHtml,
  listTemplates,
  registerContextProvider as registerSdkContextProvider,
  renderTemplate,
  type DocumentsTemplatesSdk,
  type DocumentsTemplatesSdkApi,
  type DocumentsTemplatesSdkRuntime,
  type GeneratePdfFromHtmlSdkInput,
  type ListTemplatesInput,
  type RenderTemplateSdkInput,
  type TemplateSummary,
} from './sdk';
