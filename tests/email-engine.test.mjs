import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');

const expectedFiles = [
  'src/logic/settings/email-settings.ts',
  'src/logic/send-templated-email.ts',
  'src/front-components/send-email.front-component.ts',
];

test('email engine and send modal modules exist and are publicly exported', () => {
  for (const path of expectedFiles) {
    assert.ok(existsSync(join(root, path)), `${path} should exist`);
  }

  const index = read('src/index.ts');
  for (const exportName of [
    'DEFAULT_EMAIL_SETTINGS',
    'normalizeEmailSettings',
    'sendTemplatedEmailLogic',
    'renderSendEmailModalMarkup',
    'sendEmailFrontComponent',
  ]) {
    assert.match(index, new RegExp(exportName), `src/index.ts should export ${exportName}`);
  }
});

const { PermissionDeniedError } = await import('../dist/permissions/permission-guards.js');
const {
  DEFAULT_EMAIL_SETTINGS,
  normalizeEmailSettings,
  validateRecipients,
  renderEmailSubject,
  htmlToTextFallback,
} = await import('../dist/logic/settings/email-settings.js');
const { sendTemplatedEmailLogic } = await import('../dist/logic/send-templated-email.js');
const {
  createSendEmailState,
  renderSendEmailModalMarkup,
  validateSendEmailState,
  SendEmailController,
} = await import('../dist/front-components/send-email.front-component.js');

const senderPrincipal = { permissionScopes: ['sendEmails', 'generateDocuments'] };
const viewerPrincipal = { permissionScopes: ['viewTemplates'] };

const templateRecord = {
  id: 'template-1',
  name: 'Welcome email',
  htmlSource: '<h1>Hello {{person.name}}</h1><p>Your balance is {{balance}}</p>',
  defaultSubject: 'Welcome {{person.name}}',
  status: 'ACTIVE',
  isActive: true,
  renderer: 'HANDLEBARS',
};

const repositoryApi = {
  async getRecord(objectName, id) {
    assert.equal(objectName, 'documentTemplate');
    assert.equal(id, 'template-1');
    return templateRecord;
  },
};

test('email settings validate recipients, render subjects, and build text fallback', () => {
  const settings = normalizeEmailSettings({
    defaults: { fromAddress: 'sales@example.com', fromName: 'Sales Team', adapter: 'twenty' },
    override: { replyTo: 'support@example.com', adapter: 'smtp' },
  });

  assert.equal(settings.adapter, 'smtp');
  assert.equal(settings.fromAddress, 'sales@example.com');
  assert.equal(settings.replyTo, 'support@example.com');
  assert.equal(DEFAULT_EMAIL_SETTINGS.adapter, 'twenty');

  const validRecipients = validateRecipients(['ada@example.com', ' Grace <grace@example.org> ']);
  assert.deepEqual(validRecipients.recipients, ['ada@example.com', 'Grace <grace@example.org>']);
  assert.deepEqual(validRecipients.errors, []);

  const invalidRecipients = validateRecipients(['missing-at', 'bad@@example.com']);
  assert.equal(invalidRecipients.recipients.length, 0);
  assert.match(invalidRecipients.errors.join('\n'), /Invalid recipient email: missing-at/);
  assert.match(invalidRecipients.errors.join('\n'), /Invalid recipient email: bad@@example.com/);

  assert.equal(renderEmailSubject('Invoice for {{company.name}}', { company: { name: 'ACME' } }), 'Invoice for ACME');
  assert.equal(htmlToTextFallback('<h1>Hello&nbsp;Ada</h1><p>Line<br>Two</p>'), 'Hello Ada\nLine\nTwo');
});

test('sendTemplatedEmailLogic renders template subject and HTML, attaches PDF, sends email, and logs success', async () => {
  const calls = [];
  const sent = await sendTemplatedEmailLogic({
    templateId: 'template-1',
    recipients: ['ada@example.com'],
    subjectOverride: 'Hi {{person.name}}',
    contextOverrides: { person: { name: 'Ada' }, balance: '$42.00' },
    attachPdf: true,
    generatedDocumentId: 'generated-1',
    principal: senderPrincipal,
    api: {
      ...repositoryApi,
      async updateRecord(objectName, id, data) {
        calls.push({ type: 'update', objectName, id, data });
        assert.equal(objectName, 'generatedDocument');
        assert.equal(id, 'generated-1');
        return { id, ...data };
      },
    },
    pdfGenerator: async (input) => {
      calls.push({ type: 'pdf', input });
      assert.match(input.html, /Hello Ada/);
      assert.equal(input.generatedDocumentId, 'generated-1');
      return { ok: true, pdfUrl: 'twenty://files/generated-1.pdf', status: 'PDF_GENERATED', options: {}, errors: [] };
    },
    adapter: {
      async sendEmail(input) {
        calls.push({ type: 'send', input });
        assert.equal(input.to[0], 'ada@example.com');
        assert.equal(input.subject, 'Hi Ada');
        assert.match(input.html, /Your balance is \$42\.00/);
        assert.equal(input.text, 'Hello Ada\nYour balance is $42.00');
        assert.deepEqual(input.attachments, [{ type: 'pdf', url: 'twenty://files/generated-1.pdf', fileName: 'Welcome email.pdf' }]);
        return { messageId: 'msg-123' };
      },
    },
    now: new Date('2026-03-04T05:06:07Z'),
  });

  assert.equal(sent.ok, true);
  assert.equal(sent.status, 'EMAIL_SENT');
  assert.equal(sent.messageId, 'msg-123');
  assert.equal(sent.pdfUrl, 'twenty://files/generated-1.pdf');
  assert.deepEqual(calls.map((call) => call.type), ['pdf', 'send', 'update']);
  assert.equal(calls[2].data.status, 'EMAIL_SENT');
  assert.equal(calls[2].data.emailMessageId, 'msg-123');
  assert.equal(calls[2].data.emailSentAt, '2026-03-04T05:06:07.000Z');
});

test('sendTemplatedEmailLogic rejects invalid recipients, enforces permissions, and logs adapter errors', async () => {
  const invalid = await sendTemplatedEmailLogic({
    templateId: 'template-1',
    recipients: ['not-an-email'],
    contextOverrides: { person: { name: 'Ada' } },
    principal: senderPrincipal,
    api: repositoryApi,
    adapter: { async sendEmail() { throw new Error('should not send'); } },
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.status, 'FAILED');
  assert.match(invalid.errors[0].userMessage, /valid recipient/);

  await assert.rejects(
    () => sendTemplatedEmailLogic({
      templateId: 'template-1',
      recipients: ['ada@example.com'],
      principal: viewerPrincipal,
      api: repositoryApi,
      adapter: { async sendEmail() { return { messageId: 'never' }; } },
    }),
    PermissionDeniedError,
  );

  const updates = [];
  const failed = await sendTemplatedEmailLogic({
    renderedHtml: '<h1>Outage</h1><p>Details</p>',
    recipients: ['ops@example.com'],
    subjectOverride: 'Status update',
    generatedDocumentId: 'generated-2',
    principal: senderPrincipal,
    api: {
      async updateRecord(objectName, id, data) {
        updates.push({ objectName, id, data });
        return { id, ...data };
      },
    },
    adapter: { async sendEmail() { throw new Error('SMTP rejected recipient'); } },
  });

  assert.equal(failed.ok, false);
  assert.equal(failed.status, 'FAILED');
  assert.match(failed.errors[0].message, /SMTP rejected recipient/);
  assert.equal(updates[0].objectName, 'generatedDocument');
  assert.equal(updates[0].id, 'generated-2');
  assert.equal(updates[0].data.status, 'FAILED');
  assert.match(updates[0].data.errorMessage, /SMTP rejected recipient/);
});

test('send email modal renders accessible controls and controller sends with validation', async () => {
  const state = createSendEmailState({
    templates: [{ id: 'template-1', name: 'Welcome email', isActive: true }],
    selectedTemplateId: 'template-1',
    recipientsText: 'ada@example.com, grace@example.org',
    subject: 'Welcome {{person.name}}',
    attachPdf: true,
    previewHtml: '<p>Hello Ada</p>',
  });
  const markup = renderSendEmailModalMarkup(state);

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-label="Send templated email"/);
  assert.match(markup, /name="email-recipients"/);
  assert.match(markup, /name="email-subject"[^>]*value="Welcome \{\{person.name\}\}"/);
  assert.match(markup, /aria-label="Attach generated PDF"[^>]*checked/);
  assert.deepEqual(validateSendEmailState(state), []);
  assert.match(validateSendEmailState(createSendEmailState({ recipientsText: 'bad' })).join('\n'), /valid recipient/);

  const notifications = [];
  const controller = new SendEmailController({
    principal: senderPrincipal,
    initialState: state,
    api: {
      async sendTemplatedEmail(input) {
        assert.equal(input.templateId, 'template-1');
        assert.deepEqual(input.recipients, ['ada@example.com', 'grace@example.org']);
        assert.equal(input.subjectOverride, 'Welcome {{person.name}}');
        assert.equal(input.attachPdf, true);
        return { ok: true, status: 'EMAIL_SENT', messageId: 'msg-456', errors: [] };
      },
      notify(message) { notifications.push(message); },
    },
  });

  const result = await controller.send();
  assert.equal(result.ok, true);
  assert.equal(controller.state.statusMessage, 'Email sent.');
  assert.equal(controller.state.messageId, 'msg-456');
  assert.deepEqual(notifications, [{ type: 'success', message: 'Email sent.' }]);
});
