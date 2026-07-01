"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendEmailController = exports.sendEmailFrontComponent = exports.renderSendEmailModalMarkup = exports.validateSendEmailState = exports.createSendEmailState = void 0;
const permission_guards_1 = require("../permissions/permission-guards");
const email_settings_1 = require("../logic/settings/email-settings");
const escapeAttribute = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const createSendEmailState = (input = {}) => ({
    templates: input.templates ?? [],
    selectedTemplateId: input.selectedTemplateId,
    recipientsText: input.recipientsText ?? '',
    subject: input.subject ?? '',
    attachPdf: input.attachPdf ?? false,
    previewHtml: input.previewHtml ?? '',
    statusMessage: input.statusMessage ?? '',
    messageId: input.messageId,
    errors: input.errors ?? [],
});
exports.createSendEmailState = createSendEmailState;
const validateSendEmailState = (state) => {
    const errors = [];
    if (!state.selectedTemplateId)
        errors.push('Select a template before sending email.');
    const recipients = (0, email_settings_1.validateRecipients)((0, email_settings_1.parseRecipientsText)(state.recipientsText));
    errors.push(...recipients.errors.map((error) => error.replace('Invalid recipient email', 'Enter a valid recipient email')));
    return errors;
};
exports.validateSendEmailState = validateSendEmailState;
const renderSendEmailModalMarkup = (state) => `
<section role="dialog" aria-modal="true" aria-label="Send templated email" class="send-email-modal" data-responsive-layout="stack">
  <label>Template
    <select name="email-template" aria-label="Email template">
      ${state.templates.map((template) => `<option value="${escapeAttribute(template.id)}"${template.id === state.selectedTemplateId ? ' selected' : ''}${template.isActive === false ? ' disabled' : ''}>${escapeAttribute(template.name)}</option>`).join('')}
    </select>
  </label>
  <label>Recipients
    <textarea name="email-recipients" aria-label="Email recipients">${escapeAttribute(state.recipientsText)}</textarea>
  </label>
  <label>Subject
    <input name="email-subject" aria-label="Email subject" value="${escapeAttribute(state.subject)}" />
  </label>
  <label>
    <input type="checkbox" aria-label="Attach generated PDF" name="attach-pdf"${state.attachPdf ? ' checked' : ''} />
    Attach generated PDF
  </label>
  <section aria-label="Email preview">${state.previewHtml}</section>
  <output aria-live="polite">${escapeAttribute(state.statusMessage || state.errors.join(' '))}</output>
</section>`;
exports.renderSendEmailModalMarkup = renderSendEmailModalMarkup;
exports.sendEmailFrontComponent = {
    name: 'send-templated-email',
    label: 'Send Templated Email',
    description: 'Modal for selecting recipients, subject, template, PDF attachment, and sending generated email.',
    component: exports.renderSendEmailModalMarkup,
};
class SendEmailController {
    state;
    api;
    principal;
    constructor(options) {
        this.state = options.initialState ?? (0, exports.createSendEmailState)();
        this.api = options.api;
        this.principal = options.principal;
    }
    updateField(field, value) {
        this.state = { ...this.state, [field]: value };
    }
    async send(extra = {}) {
        (0, permission_guards_1.assertPermissionScope)(this.principal, 'sendEmails');
        const errors = (0, exports.validateSendEmailState)(this.state);
        if (errors.length > 0) {
            this.state = { ...this.state, errors, statusMessage: errors[0] ?? 'Email validation failed.' };
            this.api.notify?.({ type: 'error', message: this.state.statusMessage });
            return {
                ok: false,
                status: 'FAILED',
                errors: errors.map((message) => ({ code: 'EMAIL_VALIDATION_ERROR', message, userMessage: message })),
            };
        }
        const result = await this.api.sendTemplatedEmail({
            ...extra,
            templateId: this.state.selectedTemplateId,
            recipients: (0, email_settings_1.parseRecipientsText)(this.state.recipientsText),
            subjectOverride: this.state.subject || undefined,
            attachPdf: this.state.attachPdf,
            renderedHtml: extra.renderedHtml,
            principal: this.principal,
        });
        if (result.ok) {
            this.state = { ...this.state, statusMessage: 'Email sent.', messageId: result.messageId, errors: [] };
            this.api.notify?.({ type: 'success', message: 'Email sent.' });
        }
        else {
            const message = result.errors[0]?.userMessage ?? 'Email could not be sent.';
            this.state = { ...this.state, statusMessage: message, errors: [message] };
            this.api.notify?.({ type: 'error', message });
        }
        return result;
    }
}
exports.SendEmailController = SendEmailController;
