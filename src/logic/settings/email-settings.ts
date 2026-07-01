import { renderHandlebarsTemplate } from '../rendering/handlebars-renderer';

export type EmailAdapterKind = 'twenty' | 'smtp';

export type EmailSettings = {
  adapter: EmailAdapterKind;
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
};

export type EmailSettingsInput = Partial<EmailSettings>;

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  adapter: 'twenty',
};

const isEmailAdapterKind = (value: unknown): value is EmailAdapterKind => value === 'twenty' || value === 'smtp';

const trimOptional = (value: unknown): string | undefined => {
  const trimmed = String(value ?? '').trim();
  return trimmed || undefined;
};

export const normalizeEmailSettings = (input: {
  defaults?: EmailSettingsInput;
  override?: EmailSettingsInput;
} = {}): EmailSettings => {
  const merged = { ...DEFAULT_EMAIL_SETTINGS, ...(input.defaults ?? {}), ...(input.override ?? {}) };
  return {
    adapter: isEmailAdapterKind(merged.adapter) ? merged.adapter : DEFAULT_EMAIL_SETTINGS.adapter,
    fromAddress: trimOptional(merged.fromAddress),
    fromName: trimOptional(merged.fromName),
    replyTo: trimOptional(merged.replyTo),
  };
};

const SIMPLE_EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const NAMED_EMAIL_PATTERN = /^([^<>]+)<([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)>$/;

export const normalizeRecipient = (recipient: string): string => recipient.trim().replace(/\s+/g, ' ');

const isValidRecipient = (recipient: string): boolean => {
  if (SIMPLE_EMAIL_PATTERN.test(recipient)) return true;
  const named = NAMED_EMAIL_PATTERN.exec(recipient);
  return Boolean(named && named[1]?.trim() && SIMPLE_EMAIL_PATTERN.test(named[2] ?? ''));
};

export const parseRecipientsText = (value: string): string[] =>
  value.split(/[;,\n]/).map(normalizeRecipient).filter(Boolean);

export const validateRecipients = (recipients: string[]): { recipients: string[]; errors: string[] } => {
  const valid: string[] = [];
  const errors: string[] = [];

  for (const rawRecipient of recipients) {
    const recipient = normalizeRecipient(rawRecipient);
    if (!recipient) continue;
    if (isValidRecipient(recipient)) {
      valid.push(recipient);
    } else {
      errors.push(`Invalid recipient email: ${recipient}`);
    }
  }

  if (valid.length === 0 && errors.length === 0) {
    errors.push('Enter at least one valid recipient email.');
  }

  return { recipients: valid, errors };
};

export const renderEmailSubject = (subjectTemplate: string, context: Record<string, unknown>): string => {
  const rendered = renderHandlebarsTemplate({
    htmlSource: subjectTemplate,
    context,
    strictMissingVariables: false,
  });
  if (rendered.errors.length > 0) {
    return subjectTemplate;
  }
  return rendered.html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};

const decodeEntities = (value: string): string => value
  .replaceAll('&nbsp;', ' ')
  .replaceAll('&amp;', '&')
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'");

export const htmlToTextFallback = (html: string): string => decodeEntities(html
  .replace(/<\s*br\s*\/?\s*>/gi, '\n')
  .replace(/<\s*\/\s*(p|div|h[1-6]|li|tr)\s*>/gi, '\n')
  .replace(/<\s*li\s*>/gi, '- ')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]+>/g, '')
  .split('\n')
  .map((line) => line.replace(/[\t ]+/g, ' ').trim())
  .filter(Boolean)
  .join('\n'));
