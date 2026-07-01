"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("twenty-sdk/define");
const model_identifiers_1 = require("src/constants/model-identifiers");
exports.default = (0, define_1.defineView)({
    universalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_VIEW_UNIVERSAL_IDENTIFIER,
    objectUniversalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_OBJECT_UNIVERSAL_IDENTIFIER,
    name: 'Recent Generated Documents',
    type: define_1.ViewType.TABLE,
    visibility: define_1.ViewVisibility.WORKSPACE,
    position: 41,
    fields: [
        { universalIdentifier: '80c72d6c-ee68-45f2-9d89-0ebe07e57d29', fieldMetadataUniversalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_FIELDS.name, position: 0, size: 220 },
        { universalIdentifier: '3b4a6c30-f07d-4189-819e-875f6d032490', fieldMetadataUniversalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_FIELDS.template, position: 1, size: 180 },
        { universalIdentifier: '4b3f4e1a-538b-452f-90c5-7f9d89e8ea94', fieldMetadataUniversalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_FIELDS.primaryObjectType, position: 2, size: 150 },
        { universalIdentifier: 'ad74f125-6b8b-41fa-9958-3b9b4f0815ac', fieldMetadataUniversalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_FIELDS.status, position: 3, size: 130 },
        { universalIdentifier: '98c353d7-a7e6-4d42-9915-895c372f8576', fieldMetadataUniversalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_FIELDS.pdfUrl, position: 4, size: 220 },
        { universalIdentifier: '3be5921a-b0e2-44a5-bb20-434a03bfbf2c', fieldMetadataUniversalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_FIELDS.emailSentAt, position: 5, size: 160 },
        { universalIdentifier: '36dafadc-f391-412c-aa4b-9c9dc0f14337', fieldMetadataUniversalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_FIELDS.generatedAt, position: 6, size: 160 },
    ],
    sorts: [
        { universalIdentifier: '16826903-a498-4f46-86c1-a1349c515fed', fieldMetadataUniversalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_FIELDS.generatedAt, direction: define_1.ViewSortDirection.DESC },
    ],
});
