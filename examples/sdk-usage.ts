import {
  createDocumentsTemplatesSdk,
  registerContextProvider,
  type DocumentsTemplatesSdkApi,
} from '../src/sdk';

const api: DocumentsTemplatesSdkApi = {
  async getRecord(objectName, id) {
    // Twenty exposes workspace-specific records; wire this to REST/GraphQL in runtime code.
    return { id, objectName };
  },
  async listRecords(objectName, options) {
    // Return DocumentTemplate records from Twenty's generated API.
    return objectName === 'documentTemplate' && options?.activeOnly ? [] : [];
  },
  async updateRecord(objectName, id, data) {
    return { id, objectName, ...data };
  },
};

const sdk = createDocumentsTemplatesSdk({
  principal: { permissionScopes: ['viewTemplates', 'generateDocuments', 'sendDocuments'] },
  api,
  currentUser: { id: 'user-1' },
});

registerContextProvider('hostBill', async ({ primaryRecordId }) => ({
  context: {
    hostBill: {
      invoiceId: primaryRecordId,
      total: '$42.00',
    },
  },
  warnings: [],
}), sdk.runtime);

const templates = await sdk.listTemplates({ activeOnly: true, search: 'invoice' });

const rendered = await sdk.renderTemplate({
  templateId: templates[0]?.id ?? 'invoice-template',
  primaryObjectType: 'hostBill',
  primaryRecordId: 'invoice-42',
});

const pdf = await sdk.generatePdfFromHtml({
  html: rendered.html,
  generatedDocumentId: 'generated-42',
  adapter: {
    async renderHtmlToPdf({ html }) {
      return new TextEncoder().encode(html);
    },
  },
  storage: {
    async uploadFile({ fileName }) {
      return { url: `twenty://files/${fileName}` };
    },
  },
});

await sdk.generateDocuments({
  renderedHtml: rendered.html,
  recipients: ['buyer@example.com'],
  subjectOverride: 'Your generated document',
  generatedDocumentId: 'generated-42',
  adapter: {
    async sendDocuments() {
      return { messageId: 'message-42' };
    },
  },
});

console.log({ templates, pdfUrl: pdf.pdfUrl });
