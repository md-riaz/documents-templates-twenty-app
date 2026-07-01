"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatedDocumentsNavigationMenuItem = void 0;
const model_identifiers_1 = require("src/constants/model-identifiers");
exports.generatedDocumentsNavigationMenuItem = {
    universalIdentifier: model_identifiers_1.GENERATED_DOCUMENTS_NAVIGATION_UNIVERSAL_IDENTIFIER,
    label: 'Generated Documents',
    icon: 'IconFileText',
    object: 'generatedDocument',
    position: 41,
    requiredPermissionScope: 'viewGeneratedDocs',
};
