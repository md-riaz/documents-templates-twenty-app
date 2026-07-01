import { GENERATED_DOCUMENT_VIEW_UNIVERSAL_IDENTIFIER } from 'src/constants/model-identifiers';

export const generatedDocumentView = {
  universalIdentifier: GENERATED_DOCUMENT_VIEW_UNIVERSAL_IDENTIFIER,
  object: 'generatedDocument',
  name: 'Recent Generated Documents',
  type: 'table',
  fields: ['name', 'template', 'primaryObjectType', 'status', 'pdfUrl', 'emailSentAt', 'generatedAt'],
  sort: [{ field: 'generatedAt', direction: 'desc' }],
};
