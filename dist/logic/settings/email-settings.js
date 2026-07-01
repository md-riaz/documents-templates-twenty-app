"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlToTextFallback = exports.renderEmailSubject = exports.validateRecipients = exports.parseRecipientsText = exports.normalizeRecipient = exports.normalizeEmailSettings = exports.DEFAULT_EMAIL_SETTINGS = void 0;
const handlebars_renderer_1 = require("../rendering/handlebars-renderer");
exports.DEFAULT_EMAIL_SETTINGS = {
    adapter: 'twenty',
};
const isEmailAdapterKind = (value) => value === 'twenty' || value === 'smtp';
const trimOptional = (value) => {
    const trimmed = String(value ?? '').trim();
    return trimmed || undefined;
};
const normalizeEmailSettings = (input = {}) => {
    const merged = { ...exports.DEFAULT_EMAIL_SETTINGS, ...(input.defaults ?? {}), ...(input.override ?? {}) };
    return {
        adapter: isEmailAdapterKind(merged.adapter) ? merged.adapter : exports.DEFAULT_EMAIL_SETTINGS.adapter,
        fromAddress: trimOptional(merged.fromAddress),
        fromName: trimOptional(merged.fromName),
        replyTo: trimOptional(merged.replyTo),
    };
};
exports.normalizeEmailSettings = normalizeEmailSettings;
const SIMPLE_EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const NAMED_EMAIL_PATTERN = /^([^<>]+)<([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)>$/;
const normalizeRecipient = (recipient) => recipient.trim().replace(/\s+/g, ' ');
exports.normalizeRecipient = normalizeRecipient;
const isValidRecipient = (recipient) => {
    if (SIMPLE_EMAIL_PATTERN.test(recipient))
        return true;
    const named = NAMED_EMAIL_PATTERN.exec(recipient);
    return Boolean(named && named[1]?.trim() && SIMPLE_EMAIL_PATTERN.test(named[2] ?? ''));
};
const parseRecipientsText = (value) => value.split(/[;,\n]/).map(exports.normalizeRecipient).filter(Boolean);
exports.parseRecipientsText = parseRecipientsText;
const validateRecipients = (recipients) => {
    const valid = [];
    const errors = [];
    for (const rawRecipient of recipients) {
        const recipient = (0, exports.normalizeRecipient)(rawRecipient);
        if (!recipient)
            continue;
        if (isValidRecipient(recipient)) {
            valid.push(recipient);
        }
        else {
            errors.push(`Invalid recipient email: ${recipient}`);
        }
    }
    if (valid.length === 0 && errors.length === 0) {
        errors.push('Enter at least one valid recipient email.');
    }
    return { recipients: valid, errors };
};
exports.validateRecipients = validateRecipients;
const renderEmailSubject = (subjectTemplate, context) => {
    const rendered = (0, handlebars_renderer_1.renderHandlebarsTemplate)({
        htmlSource: subjectTemplate,
        context,
        strictMissingVariables: false,
    });
    if (rendered.errors.length > 0) {
        return subjectTemplate;
    }
    return rendered.html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
};
exports.renderEmailSubject = renderEmailSubject;
const decodeEntities = (value) => value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
const htmlToTextFallback = (html) => decodeEntities(html
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
exports.htmlToTextFallback = htmlToTextFallback;
