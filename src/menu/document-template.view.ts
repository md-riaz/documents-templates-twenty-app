import { defineView, ViewSortDirection, ViewType, ViewVisibility } from 'twenty-sdk/define';

import {
  DOCUMENT_TEMPLATE_FIELDS,
  DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  DOCUMENT_TEMPLATE_VIEW_UNIVERSAL_IDENTIFIER,
} from '../constants/model-identifiers';

export default defineView({
  universalIdentifier: DOCUMENT_TEMPLATE_VIEW_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'Templates',
  type: ViewType.TABLE,
  visibility: ViewVisibility.WORKSPACE,
  position: 40,
  fields: [
    { universalIdentifier: 'e3ee63a7-2bf8-42f4-9ba0-6eddbca4f6e1', fieldMetadataUniversalIdentifier: DOCUMENT_TEMPLATE_FIELDS.name, position: 0, size: 180 },
    { universalIdentifier: 'ae84e8c8-4bdb-4ec7-a4e4-c6c913805ae6', fieldMetadataUniversalIdentifier: DOCUMENT_TEMPLATE_FIELDS.category, position: 1, size: 160 },
    { universalIdentifier: 'ac0a7bb6-f9a2-4fa7-9149-d59c6e14f085', fieldMetadataUniversalIdentifier: DOCUMENT_TEMPLATE_FIELDS.status, position: 2, size: 120 },
    { universalIdentifier: '28e3ff51-df09-4d66-9f2e-bc9a165b9d50', fieldMetadataUniversalIdentifier: DOCUMENT_TEMPLATE_FIELDS.renderer, position: 3, size: 120 },
    { universalIdentifier: '9169b0b1-2e9d-4275-a5df-8f278b7c5ea1', fieldMetadataUniversalIdentifier: DOCUMENT_TEMPLATE_FIELDS.version, position: 4, size: 90 },
    { universalIdentifier: 'a7573e8d-c5cb-44b0-a74a-9d9730cf9293', fieldMetadataUniversalIdentifier: DOCUMENT_TEMPLATE_FIELDS.boundObjectName, position: 5, size: 120 },
  ],
  sorts: [
    { universalIdentifier: '95699ab7-f04d-4913-9c89-ec81055423bd', fieldMetadataUniversalIdentifier: DOCUMENT_TEMPLATE_FIELDS.name, direction: ViewSortDirection.DESC },
  ],
});

