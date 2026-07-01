import type {
  DocumentsTemplatesSdk,
  DocumentsTemplatesSdkApi,
  GeneratePdfFromHtmlSdkInput,
  ListTemplatesInput,
  RenderTemplateSdkInput,
  TemplateSummary,
} from '../../src/sdk';
import {
  createDocumentsTemplatesSdk,
  generatePdfFromHtml,
  listTemplates,
  registerContextProvider,
  renderTemplate,
} from '../../src/sdk';

const api: DocumentsTemplatesSdkApi = {
  async getRecord(_objectName: string, id: string) {
    return { id, name: 'Template', htmlSource: '<p>{{name}}</p>', isActive: true, status: 'ACTIVE' };
  },
  async listRecords() {
    return [{ id: 'template-1', name: 'Template', isActive: true }];
  },
  async updateRecord(_objectName: string, id: string, data: Record<string, unknown>) {
    return { id, ...data };
  },
};

const sdk: DocumentsTemplatesSdk = createDocumentsTemplatesSdk({
  principal: { permissionScopes: ['viewTemplates', 'generateDocuments'] },
  api,
});

const renderInput: RenderTemplateSdkInput = {
  templateId: 'template-1',
  contextOverrides: { name: 'Ada' },
};
const rendered = await renderTemplate(renderInput, sdk.runtime);
rendered.html satisfies string;

const pdfInput: GeneratePdfFromHtmlSdkInput = {
  html: rendered.html,
  adapter: { async renderHtmlToPdf() { return new Uint8Array(); } },
  storage: { async uploadFile() { return { url: 'twenty://files/document.pdf' }; } },
};
const pdf = await generatePdfFromHtml(pdfInput, sdk.runtime);
pdf.pdfUrl satisfies string | undefined;

const listInput: ListTemplatesInput = { activeOnly: true, search: 'template' };
const templates: TemplateSummary[] = await listTemplates(listInput, sdk.runtime);
templates[0]?.name satisfies string | undefined;

registerContextProvider('hostBill', async ({ primaryRecordId }) => ({
  context: { hostBill: { invoiceId: primaryRecordId } },
  warnings: [],
}), sdk.runtime);

await sdk.renderTemplate(renderInput);
await sdk.generatePdfFromHtml(pdfInput);
await sdk.listTemplates(listInput);
