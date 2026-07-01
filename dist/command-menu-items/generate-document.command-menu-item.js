"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDocumentCommandMenuItem = void 0;
const model_identifiers_1 = require("src/constants/model-identifiers");
exports.generateDocumentCommandMenuItem = {
    universalIdentifier: model_identifiers_1.GENERATE_DOCUMENT_COMMAND_UNIVERSAL_IDENTIFIER,
    label: 'Generate Document',
    icon: 'IconFileText',
    section: 'Documents & Templates',
    frontComponent: 'document-shell',
    context: 'record',
    requiredPermissionScope: 'generateDocuments',
};
