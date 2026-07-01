import { DOCUMENT_TEMPLATE_VIEW_UNIVERSAL_IDENTIFIER } from 'src/constants/model-identifiers';

export const documentTemplateView = {
  universalIdentifier: DOCUMENT_TEMPLATE_VIEW_UNIVERSAL_IDENTIFIER,
  object: 'documentTemplate',
  name: 'Active Templates',
  type: 'table',
  fields: ['name', 'category', 'status', 'renderer', 'version', 'isActive'],
  sort: [{ field: 'name', direction: 'asc' }],
  filters: [{ field: 'isActive', operator: 'eq', value: true }],
};
