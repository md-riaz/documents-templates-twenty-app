"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatedDocumentView = void 0;
const model_identifiers_1 = require("src/constants/model-identifiers");
exports.generatedDocumentView = {
    universalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_VIEW_UNIVERSAL_IDENTIFIER,
    object: 'generatedDocument',
    name: 'Recent Generated Documents',
    type: 'table',
    fields: ['name', 'template', 'primaryObjectType', 'status', 'pdfUrl', 'emailSentAt', 'generatedAt'],
    sort: [{ field: 'generatedAt', direction: 'desc' }],
};
