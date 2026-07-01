"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTemplatedEmailLogic = void 0;
const permission_guards_1 = require("../permissions/permission-guards");
const generate_pdf_1 = require("./generate-pdf");
const render_template_1 = require("./render-template");
const email_settings_1 = require("./settings/email-settings");
const defaultEmailAdapter = {
    async sendEmail() {
        throw new Error('No Twenty email or SMTP adapter configured for this runtime.');
    },
};
const errorResult = (code, message, userMessage) => ({
    ok: false,
    status: 'FAILED',
    errors: [{ code, message, userMessage }],
});
const updateGeneratedDocument = async (api, generatedDocumentId, data) => {
    if (generatedDocumentId) {
        await api?.updateRecord?.('generatedDocument', generatedDocumentId, data);
    }
};
const defaultSubjectFor = (templateName) => templateName ? `${templateName}` : 'Generated document';
const renderEmailBody = async (input) => {
    if (input.renderedHtml) {
        return {
            ok: true,
            html: input.renderedHtml,
            context: input.contextOverrides ?? {},
            subjectTemplate: input.subjectOverride ?? 'Generated document',
            errors: [],
        };
    }
    if (!input.templateId) {
        return {
            ok: false,
            html: '',
            context: {},
            subjectTemplate: '',
            errors: [{
                    code: 'EMAIL_TEMPLATE_REQUIRED',
                    message: 'Template ID or rendered HTML is required to send email.',
                    userMessage: 'Select a template before sending email.',
                }],
        };
    }
    const rendered = await (0, render_template_1.renderTemplateLogic)({
        templateId: input.templateId,
        primaryObjectType: input.primaryObjectType,
        primaryRecordId: input.primaryRecordId,
        contextOverrides: input.contextOverrides,
        previewData: input.previewData,
        strictMissingVariables: input.strictMissingVariables,
        principal: input.principal,
        api: input.api,
        currentUser: input.currentUser,
    });
    if (!rendered.ok) {
        return {
            ok: false,
            html: '',
            context: rendered.context,
            subjectTemplate: '',
            errors: rendered.errors.map((error) => ({
                code: error.code,
                message: error.message,
                userMessage: error.userMessage,
            })),
        };
    }
    return {
        ok: true,
        html: rendered.html,
        context: rendered.context,
        subjectTemplate: input.subjectOverride ?? rendered.template?.defaultSubject ?? defaultSubjectFor(rendered.template?.name),
        templateName: rendered.template?.name,
        errors: [],
    };
};
const sendTemplatedEmailLogic = async (input) => {
    (0, permission_guards_1.assertPermissionScope)(input.principal, 'sendEmails');
    const recipients = (0, email_settings_1.validateRecipients)(input.recipients);
    if (recipients.errors.length > 0) {
        return errorResult('INVALID_RECIPIENTS', recipients.errors.join('\n'), 'Enter at least one valid recipient before sending email.');
    }
    const body = await renderEmailBody(input);
    if (!body.ok) {
        return { ok: false, status: 'FAILED', errors: body.errors };
    }
    const settings = (0, email_settings_1.normalizeEmailSettings)({ defaults: input.workspaceDefaults, override: input.settings });
    let pdfUrl;
    const attachments = [];
    if (input.attachPdf) {
        const pdfGenerator = input.pdfGenerator ?? generate_pdf_1.generatePdfFromHtmlLogic;
        const pdf = await pdfGenerator({
            html: body.html,
            generatedDocumentId: input.generatedDocumentId,
            fileName: `${body.templateName ?? 'Generated document'}.pdf`,
            principal: input.principal,
            api: input.api,
            metadata: input.metadata,
        });
        if (!pdf.ok || !pdf.pdfUrl) {
            const message = pdf.errors[0]?.message ?? 'PDF attachment could not be generated.';
            await updateGeneratedDocument(input.api, input.generatedDocumentId, { status: 'FAILED', errorMessage: message });
            return errorResult('EMAIL_ATTACHMENT_ERROR', message, 'PDF attachment could not be generated.');
        }
        pdfUrl = pdf.pdfUrl;
        attachments.push({ type: 'pdf', url: pdfUrl, fileName: `${body.templateName ?? 'Generated document'}.pdf` });
    }
    const subject = (0, email_settings_1.renderEmailSubject)(body.subjectTemplate, body.context);
    const text = (0, email_settings_1.htmlToTextFallback)(body.html);
    const adapter = input.adapter ?? defaultEmailAdapter;
    try {
        const sent = await adapter.sendEmail({
            to: recipients.recipients,
            subject,
            html: body.html,
            text,
            from: { address: settings.fromAddress, name: settings.fromName },
            replyTo: settings.replyTo,
            attachments,
            metadata: input.metadata,
        });
        const emailSentAt = (input.now ?? new Date()).toISOString();
        await updateGeneratedDocument(input.api, input.generatedDocumentId, {
            status: 'EMAIL_SENT',
            emailSentAt,
            emailMessageId: sent.messageId,
            errorMessage: null,
            ...(pdfUrl ? { pdfUrl } : {}),
        });
        return {
            ok: true,
            status: 'EMAIL_SENT',
            messageId: sent.messageId,
            subject,
            html: body.html,
            text,
            pdfUrl,
            errors: [],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await updateGeneratedDocument(input.api, input.generatedDocumentId, { status: 'FAILED', errorMessage: message });
        return errorResult('EMAIL_SEND_ERROR', message, 'Email could not be sent. Try again or contact an administrator.');
    }
};
exports.sendTemplatedEmailLogic = sendTemplatedEmailLogic;
