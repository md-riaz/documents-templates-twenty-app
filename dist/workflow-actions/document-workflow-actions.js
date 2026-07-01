"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDocumentWorkflowAction = exports.documentWorkflowActions = exports.saveGeneratedDocumentWorkflowAction = exports.sendTemplatedEmailWorkflowAction = exports.generatePdfWorkflowAction = exports.renderTemplateWorkflowAction = exports.GLOBAL_TRIGGER_REQUIREMENTS = void 0;
const generate_pdf_1 = require("../logic/generate-pdf");
const render_template_1 = require("../logic/render-template");
const save_generated_document_1 = require("../logic/save-generated-document");
const send_templated_email_1 = require("../logic/send-templated-email");
exports.GLOBAL_TRIGGER_REQUIREMENTS = [
    'Global triggers do not provide a primary record automatically.',
    'Provide templateId explicitly for Render Template, Send Templated Email, and Save Generated Document actions.',
    'Provide contextOverrides or previewData when no Single-record trigger context is available.',
    'For Bulk workflows, use the Twenty workflow iterator/list-selection step and run these actions once per record.',
].join(' ');
const iteratorTriggerPatterns = ['Single', 'BulkIterator'];
exports.renderTemplateWorkflowAction = {
    key: 'documents.renderTemplate',
    name: 'Render Template',
    description: 'Render an active document template with a Single record context or one Bulk iterator item.',
    requiredScopes: ['generateDocuments'],
    triggerPatterns: iteratorTriggerPatterns,
    globalTriggerRequirements: exports.GLOBAL_TRIGGER_REQUIREMENTS,
    inputs: [
        'templateId',
        'primaryObjectType',
        'primaryRecordId',
        'contextOverrides',
        'previewData',
        'strictMissingVariables',
    ],
    outputs: ['html', 'context', 'warnings', 'template'],
    run: render_template_1.renderTemplateLogic,
};
exports.generatePdfWorkflowAction = {
    key: 'documents.generatePdf',
    name: 'Generate PDF',
    description: 'Generate and store a PDF from rendered HTML produced by a previous workflow step.',
    requiredScopes: ['generateDocuments'],
    triggerPatterns: iteratorTriggerPatterns,
    globalTriggerRequirements: exports.GLOBAL_TRIGGER_REQUIREMENTS,
    inputs: ['html', 'settings', 'workspaceDefaults', 'generatedDocumentId', 'fileName'],
    inputsFrom: ['html', 'generatedDocumentId'],
    outputs: ['pdfUrl', 'bytes', 'status', 'options'],
    async run(input) {
        return (0, generate_pdf_1.generatePdfFromHtmlLogic)(input);
    },
};
exports.sendTemplatedEmailWorkflowAction = {
    key: 'documents.sendTemplatedEmail',
    name: 'Send Templated Email',
    description: 'Send rendered HTML or render a template and email it through the configured Twenty/SMTP adapter.',
    requiredScopes: ['sendEmails'],
    triggerPatterns: iteratorTriggerPatterns,
    globalTriggerRequirements: exports.GLOBAL_TRIGGER_REQUIREMENTS,
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
    run: send_templated_email_1.sendTemplatedEmailLogic,
};
exports.saveGeneratedDocumentWorkflowAction = {
    key: 'documents.saveGeneratedDocument',
    name: 'Save Generated Document',
    description: 'Persist rendered workflow output as a GeneratedDocument record.',
    requiredScopes: ['generateDocuments'],
    triggerPatterns: iteratorTriggerPatterns,
    globalTriggerRequirements: exports.GLOBAL_TRIGGER_REQUIREMENTS,
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
        const saved = await (0, save_generated_document_1.saveGeneratedDocumentLogic)(input);
        return {
            ...saved,
            generatedDocumentId: saved.id,
        };
    },
};
exports.documentWorkflowActions = [
    exports.renderTemplateWorkflowAction,
    exports.generatePdfWorkflowAction,
    exports.sendTemplatedEmailWorkflowAction,
    exports.saveGeneratedDocumentWorkflowAction,
];
const runDocumentWorkflowAction = async (action, input) => action.run(input);
exports.runDocumentWorkflowAction = runDocumentWorkflowAction;
