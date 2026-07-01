import {
  generatePdfFromHtmlLogic,
  type GeneratePdfFromHtmlInput,
  type GeneratePdfFromHtmlOutput,
} from '../logic/generate-pdf';
import {
  renderTemplateLogic,
  type RenderTemplateLogicInput,
  type RenderTemplateLogicOutput,
} from '../logic/render-template';
import {
  saveGeneratedDocumentLogic,
  type SaveGeneratedDocumentInput,
  type SaveGeneratedDocumentOutput,
} from '../logic/save-generated-document';
import {
  sendTemplatedEmailLogic,
  type SendTemplatedEmailInput,
  type SendTemplatedEmailOutput,
} from '../logic/send-templated-email';
import type { DocumentsTemplatesPermissionScope } from '../permissions/scopes';

export type WorkflowTriggerPattern = 'Single' | 'BulkIterator';

export type DocumentWorkflowActionOutput =
  | RenderTemplateLogicOutput
  | (GeneratePdfFromHtmlOutput & { html?: string })
  | (SaveGeneratedDocumentOutput & { generatedDocumentId?: string })
  | SendTemplatedEmailOutput;

export type DocumentWorkflowActionDefinition<TInput, TOutput extends DocumentWorkflowActionOutput> = {
  key: string;
  name: string;
  description: string;
  requiredScopes: DocumentsTemplatesPermissionScope[];
  triggerPatterns: WorkflowTriggerPattern[];
  globalTriggerRequirements: string;
  inputs: string[];
  inputsFrom?: string[];
  outputs: string[];
  run: (input: TInput) => Promise<TOutput>;
};

export const GLOBAL_TRIGGER_REQUIREMENTS = [
  'Global triggers do not provide a primary record automatically.',
  'Provide templateId explicitly for Render Template, Send Templated Email, and Save Generated Document actions.',
  'Provide contextOverrides or previewData when no Single-record trigger context is available.',
  'For Bulk workflows, use the Twenty workflow iterator/list-selection step and run these actions once per record.',
].join(' ');

const iteratorTriggerPatterns: WorkflowTriggerPattern[] = ['Single', 'BulkIterator'];

export const renderTemplateWorkflowAction: DocumentWorkflowActionDefinition<
  RenderTemplateLogicInput,
  RenderTemplateLogicOutput
> = {
  key: 'documents.renderTemplate',
  name: 'Render Template',
  description: 'Render an active document template with a Single record context or one Bulk iterator item.',
  requiredScopes: ['generateDocuments'],
  triggerPatterns: iteratorTriggerPatterns,
  globalTriggerRequirements: GLOBAL_TRIGGER_REQUIREMENTS,
  inputs: [
    'templateId',
    'primaryObjectType',
    'primaryRecordId',
    'contextOverrides',
    'previewData',
    'strictMissingVariables',
  ],
  outputs: ['html', 'context', 'warnings', 'template'],
  run: renderTemplateLogic,
};

export const generatePdfWorkflowAction: DocumentWorkflowActionDefinition<
  GeneratePdfFromHtmlInput,
  GeneratePdfFromHtmlOutput & { html?: string }
> = {
  key: 'documents.generatePdf',
  name: 'Generate PDF',
  description: 'Generate a PDF from rendered HTML, upload it, and attach it to the source record when record context is provided.',
  requiredScopes: ['generateDocuments'],
  triggerPatterns: iteratorTriggerPatterns,
  globalTriggerRequirements: GLOBAL_TRIGGER_REQUIREMENTS,
  inputs: ['html', 'settings', 'workspaceDefaults', 'generatedDocumentId', 'sourceObjectName', 'sourceRecordId', 'fileName'],
  inputsFrom: ['html', 'generatedDocumentId', 'primaryObjectType', 'primaryRecordId'],
  outputs: ['pdfUrl', 'bytes', 'status', 'options'],
  async run(input) {
    return generatePdfFromHtmlLogic(input);
  },
};

export const sendTemplatedEmailWorkflowAction: DocumentWorkflowActionDefinition<
  SendTemplatedEmailInput,
  SendTemplatedEmailOutput
> = {
  key: 'documents.sendTemplatedEmail',
  name: 'Send Templated Email',
  description: 'Send rendered HTML or render a template and email it through the configured Twenty/SMTP adapter.',
  requiredScopes: ['sendEmails'],
  triggerPatterns: iteratorTriggerPatterns,
  globalTriggerRequirements: GLOBAL_TRIGGER_REQUIREMENTS,
  inputs: [
    'templateId',
    'renderedHtml',
    'recipients',
    'subjectOverride',
    'contextOverrides',
    'attachPdf',
    'generatedDocumentId',
  ],
  inputsFrom: ['html', 'context', 'generatedDocumentId', 'pdfUrl'],
  outputs: ['messageId', 'status', 'subject', 'html', 'text', 'pdfUrl'],
  run: sendTemplatedEmailLogic,
};

export const saveGeneratedDocumentWorkflowAction: DocumentWorkflowActionDefinition<
  SaveGeneratedDocumentInput,
  SaveGeneratedDocumentOutput & { generatedDocumentId?: string }
> = {
  key: 'documents.saveGeneratedDocument',
  name: 'Save Generated Document',
  description: 'Persist rendered workflow output as a GeneratedDocument record.',
  requiredScopes: ['generateDocuments'],
  triggerPatterns: iteratorTriggerPatterns,
  globalTriggerRequirements: GLOBAL_TRIGGER_REQUIREMENTS,
  inputs: [
    'templateId',
    'primaryObjectType',
    'primaryRecordId',
    'renderedHtml',
    'pdfUrl',
    'status',
    'metadata',
  ],
  inputsFrom: ['html', 'pdfUrl', 'warnings'],
  outputs: ['generatedDocumentId', 'record'],
  async run(input) {
    const saved = await saveGeneratedDocumentLogic(input);
    return {
      ...saved,
      generatedDocumentId: saved.id,
    };
  },
};

export const documentWorkflowActions = [
  renderTemplateWorkflowAction,
  generatePdfWorkflowAction,
  sendTemplatedEmailWorkflowAction,
  saveGeneratedDocumentWorkflowAction,
] as const;

export type DocumentWorkflowAction = (typeof documentWorkflowActions)[number];

export const runDocumentWorkflowAction = async <
  TInput,
  TOutput extends DocumentWorkflowActionOutput,
>(
  action: DocumentWorkflowActionDefinition<TInput, TOutput>,
  input: TInput,
): Promise<TOutput> => action.run(input);
