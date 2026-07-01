import { assertPermissionScope, type PermissionPrincipal } from '../permissions/permission-guards';
import { parseRecipientsText, validateRecipients } from '../logic/settings/email-settings';
import type { SendTemplatedEmailInput, SendTemplatedEmailOutput } from '../logic/send-templated-email';

export type SendEmailTemplateOption = {
  id: string;
  name: string;
  isActive?: boolean;
};

export type SendEmailState = {
  templates: SendEmailTemplateOption[];
  selectedTemplateId?: string;
  recipientsText: string;
  subject: string;
  attachPdf: boolean;
  previewHtml: string;
  statusMessage: string;
  messageId?: string;
  errors: string[];
};

export type SendEmailControllerApi = {
  sendTemplatedEmail(input: SendTemplatedEmailInput): Promise<SendTemplatedEmailOutput>;
  notify?(message: { type: 'success' | 'error'; message: string }): void;
};

const escapeAttribute = (value: unknown): string =>
  String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const createSendEmailState = (input: Partial<SendEmailState> = {}): SendEmailState => ({
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

export const validateSendEmailState = (state: Pick<SendEmailState, 'recipientsText' | 'selectedTemplateId'>): string[] => {
  const errors: string[] = [];
  if (!state.selectedTemplateId) errors.push('Select a template before sending email.');
  const recipients = validateRecipients(parseRecipientsText(state.recipientsText));
  errors.push(...recipients.errors.map((error) => error.replace('Invalid recipient email', 'Enter a valid recipient email')));
  return errors;
};

export const renderSendEmailModalMarkup = (state: SendEmailState): string => `
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

export const sendEmailFrontComponent = {
  name: 'send-templated-email',
  label: 'Send Templated Email',
  description: 'Modal for selecting recipients, subject, template, PDF attachment, and sending generated email.',
  component: renderSendEmailModalMarkup,
};

export class SendEmailController {
  public state: SendEmailState;
  private readonly api: SendEmailControllerApi;
  private readonly principal?: PermissionPrincipal;

  constructor(options: { initialState?: SendEmailState; api: SendEmailControllerApi; principal?: PermissionPrincipal }) {
    this.state = options.initialState ?? createSendEmailState();
    this.api = options.api;
    this.principal = options.principal;
  }

  updateField(field: keyof SendEmailState, value: unknown): void {
    this.state = { ...this.state, [field]: value } as SendEmailState;
  }

  async send(extra: Partial<SendTemplatedEmailInput> = {}): Promise<SendTemplatedEmailOutput> {
    assertPermissionScope(this.principal, 'sendEmails');
    const errors = validateSendEmailState(this.state);
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
      recipients: parseRecipientsText(this.state.recipientsText),
      subjectOverride: this.state.subject || undefined,
      attachPdf: this.state.attachPdf,
      renderedHtml: extra.renderedHtml,
      principal: this.principal,
    });

    if (result.ok) {
      this.state = { ...this.state, statusMessage: 'Email sent.', messageId: result.messageId, errors: [] };
      this.api.notify?.({ type: 'success', message: 'Email sent.' });
    } else {
      const message = result.errors[0]?.userMessage ?? 'Email could not be sent.';
      this.state = { ...this.state, statusMessage: message, errors: [message] };
      this.api.notify?.({ type: 'error', message });
    }
    return result;
  }
}
