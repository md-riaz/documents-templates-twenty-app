export { default as applicationConfig } from './application-config';
export { default as defaultRole } from './default-role';
export { default as documentTemplateObject } from './objects/document-template.object';
export { default as templateCategoryObject } from './objects/template-category.object';
export { default as templateVersionObject } from './objects/template-version.object';
export { default as generatedDocumentObject } from './objects/generated-document.object';
export { default as documentTemplateView } from './menu/document-template.view';
export { default as generatedDocumentView } from './menu/generated-document.view';
export { default as documentsTemplatesNavigationMenuItem } from './menu/documents-templates.navigation-menu-item';
export { default as documentShellFrontComponent } from './front-components/document-shell.front-component';
export {
  TemplateEditorController,
  createTemplateEditorState,
  insertVariableExpression,
  renderTemplateEditorMarkup,
  templateEditorFrontComponent,
  validateTemplateEditorState,
  type TemplateEditorApi,
  type TemplateEditorState,
  type TemplateEditorTab,
  type TemplateEditorTemplate,
  type TemplateEditorVariable,
} from './front-components/template-editor.front-component';
export {
  GenerateDocumentController,
  createGenerateDocumentState,
  filterGeneratedDocumentHistory,
  generateDocumentFrontComponent,
  generatedDocumentHistoryFrontComponent,
  isGenerateDocumentActionVisible,
  renderGeneratedDocumentHistoryMarkup,
  renderGenerateDocumentModalMarkup,
  type GeneratedDocumentHistoryRecord,
  type GenerateDocumentApi,
  type GenerateDocumentState,
  type GenerateDocumentTemplate,
} from './front-components/generate-document.front-component';
export {
  createPdfSettingsState,
  pdfSettingsFrontComponent,
  renderPdfSettingsMarkup,
  validatePdfSettingsState,
  type PdfSettingsState,
} from './front-components/pdf-settings.front-component';
export {
  calendarEventDocumentsPageLayoutTab,
  companyDocumentsPageLayoutTab,
  documentsStandardRecordTabs,
  noteDocumentsPageLayoutTab,
  opportunityDocumentsPageLayoutTab,
  personDocumentsPageLayoutTab,
  taskDocumentsPageLayoutTab,
} from './page-layout-tabs/documents-standard-record-tabs';
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
  DEFAULT_CONTEXT_PROVIDER_NAMES,
  createDefaultContextProviders,
  loadDefaultRecordContext,
  type DefaultContextProviderName,
} from './logic/context/default-providers';
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
export { combineCssWithHtml } from './logic/rendering/css-combiner';
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
  listTemplateVariablesLogic,
  type ListTemplateVariablesInput,
  type TemplateVariableInfo,
} from './logic/list-template-variables';
export {
  buildGeneratedDocumentRecord,
  saveGeneratedDocumentLogic,
  type GeneratedDocumentRepositoryApi,
  type GeneratedDocumentStatus,
  type SaveGeneratedDocumentInput,
  type SaveGeneratedDocumentOutput,
} from './logic/save-generated-document';
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
  type GeneratedDocumentUpdateApi,
  type GeneratePdfFromHtmlInput,
  type GeneratePdfFromHtmlOutput,
  type HtmlToPdfAdapter,
  type PdfStorageAdapter,
  type SourceRecordAttachmentResult,
} from './logic/generate-pdf';
export {
  ACCEPTANCE_SCENARIOS,
  renderRtlSmokeFixture,
  runAcceptanceScenario,
  sanitizeGeneratedDocumentHtml,
  validateGeneratedDocumentAuditTrail,
  type AcceptanceContext,
  type AcceptanceScenario,
  type AcceptanceScenarioId,
} from './logic/acceptance-hardening';
export {
  GLOBAL_TRIGGER_REQUIREMENTS,
  documentWorkflowActions,
  generatePdfWorkflowAction,
  renderTemplateWorkflowAction,
  runDocumentWorkflowAction,
  saveGeneratedDocumentWorkflowAction,
  type DocumentWorkflowAction,
  type DocumentWorkflowActionDefinition,
  type DocumentWorkflowActionOutput,
  type WorkflowTriggerPattern,
} from './workflow-actions/document-workflow-actions';
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
