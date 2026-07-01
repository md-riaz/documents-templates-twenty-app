import { assertPermissionScope, type PermissionPrincipal } from '../permissions/permission-guards';
import { generatePdfFromHtmlLogic, type GeneratePdfFromHtmlInput, type GeneratePdfFromHtmlOutput } from './generate-pdf';
import { renderTemplateLogic, type TemplateRepositoryApi } from './render-template';
import {
  htmlToTextFallback,
  normalizeEmailSettings,
  renderEmailSubject,
  validateRecipients,
  type EmailSettingsInput,
} from './settings/email-settings';

export type EmailAttachment = {
  type: 'pdf';
  url: string;
  fileName: string;
};

export type TemplatedEmailAdapter = {
  sendEmail(input: {
    to: string[];
    subject: string;
    html: string;
    text: string;
    from?: { address?: string; name?: string };
    replyTo?: string;
    attachments: EmailAttachment[];
    metadata?: Record<string, unknown>;
  }): Promise<{ messageId: string }>;
};

export type GeneratedDocumentEmailLogApi = TemplateRepositoryApi & {
  updateRecord?: (objectName: string, id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

export type SendTemplatedEmailInput = {
  templateId?: string;
  renderedHtml?: string;
  recipients: string[];
  subjectOverride?: string;
  primaryObjectType?: string;
  primaryRecordId?: string;
  contextOverrides?: Record<string, unknown>;
  previewData?: Record<string, unknown>;
  strictMissingVariables?: boolean;
  attachPdf?: boolean;
  generatedDocumentId?: string;
  settings?: EmailSettingsInput;
  workspaceDefaults?: EmailSettingsInput;
  principal?: PermissionPrincipal;
  api?: GeneratedDocumentEmailLogApi;
  adapter?: TemplatedEmailAdapter;
  pdfGenerator?: (input: GeneratePdfFromHtmlInput) => Promise<GeneratePdfFromHtmlOutput>;
  currentUser?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  now?: Date;
};

export type SendTemplatedEmailOutput = {
  ok: boolean;
  status: 'EMAIL_SENT' | 'FAILED';
  messageId?: string;
  subject?: string;
  html?: string;
  text?: string;
  pdfUrl?: string;
  errors: Array<{ code: string; message: string; userMessage: string }>;
};

const defaultEmailAdapter: TemplatedEmailAdapter = {
  async sendEmail() {
    throw new Error('No Twenty email or SMTP adapter configured for this runtime.');
  },
};

const errorResult = (code: string, message: string, userMessage: string): SendTemplatedEmailOutput => ({
  ok: false,
  status: 'FAILED',
  errors: [{ code, message, userMessage }],
});

const updateGeneratedDocument = async (
  api: GeneratedDocumentEmailLogApi | undefined,
  generatedDocumentId: string | undefined,
  data: Record<string, unknown>,
): Promise<void> => {
  if (generatedDocumentId) {
    await api?.updateRecord?.('generatedDocument', generatedDocumentId, data);
  }
};

const defaultSubjectFor = (templateName?: string): string => templateName ? `${templateName}` : 'Generated document';

const renderEmailBody = async (input: SendTemplatedEmailInput): Promise<{
  ok: boolean;
  html: string;
  context: Record<string, unknown>;
  subjectTemplate: string;
  templateName?: string;
  errors: SendTemplatedEmailOutput['errors'];
}> => {
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

  const rendered = await renderTemplateLogic({
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

export const sendTemplatedEmailLogic = async (input: SendTemplatedEmailInput): Promise<SendTemplatedEmailOutput> => {
  assertPermissionScope(input.principal, 'sendEmails');

  const recipients = validateRecipients(input.recipients);
  if (recipients.errors.length > 0) {
    return errorResult('INVALID_RECIPIENTS', recipients.errors.join('\n'), 'Enter at least one valid recipient before sending email.');
  }

  const body = await renderEmailBody(input);
  if (!body.ok) {
    return { ok: false, status: 'FAILED', errors: body.errors };
  }

  const settings = normalizeEmailSettings({ defaults: input.workspaceDefaults, override: input.settings });
  let pdfUrl: string | undefined;
  const attachments: EmailAttachment[] = [];

  if (input.attachPdf) {
    const pdfGenerator = input.pdfGenerator ?? generatePdfFromHtmlLogic;
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

  const subject = renderEmailSubject(body.subjectTemplate, body.context);
  const text = htmlToTextFallback(body.html);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateGeneratedDocument(input.api, input.generatedDocumentId, { status: 'FAILED', errorMessage: message });
    return errorResult('EMAIL_SEND_ERROR', message, 'Email could not be sent. Try again or contact an administrator.');
  }
};
