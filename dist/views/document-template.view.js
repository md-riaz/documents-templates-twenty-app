"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("twenty-sdk/define");
const model_identifiers_1 = require("src/constants/model-identifiers");
exports.default = (0, define_1.defineView)({
    universalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_VIEW_UNIVERSAL_IDENTIFIER,
    objectUniversalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
    name: 'Active Templates',
    type: define_1.ViewType.TABLE,
    visibility: define_1.ViewVisibility.WORKSPACE,
    position: 40,
    fields: [
        { universalIdentifier: 'e3ee63a7-2bf8-42f4-9ba0-6eddbca4f6e1', fieldMetadataUniversalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.name, position: 0, size: 180 },
        { universalIdentifier: 'ae84e8c8-4bdb-4ec7-a4e4-c6c913805ae6', fieldMetadataUniversalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.category, position: 1, size: 160 },
        { universalIdentifier: 'ac0a7bb6-f9a2-4fa7-9149-d59c6e14f085', fieldMetadataUniversalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.status, position: 2, size: 120 },
        { universalIdentifier: '28e3ff51-df09-4d66-9f2e-bc9a165b9d50', fieldMetadataUniversalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.renderer, position: 3, size: 120 },
        { universalIdentifier: '9169b0b1-2e9d-4275-a5df-8f278b7c5ea1', fieldMetadataUniversalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.version, position: 4, size: 90 },
        { universalIdentifier: '3f73329f-17a9-450c-b3f9-8700c721f5e4', fieldMetadataUniversalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.isActive, position: 5, size: 100 },
    ],
    sorts: [
        { universalIdentifier: '95699ab7-f04d-4913-9c89-ec81055423bd', fieldMetadataUniversalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_FIELDS.name, direction: define_1.ViewSortDirection.ASC },
    ],
});
