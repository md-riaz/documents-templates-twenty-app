"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsTemplatesNavigationMenuItem = void 0;
const model_identifiers_1 = require("src/constants/model-identifiers");
exports.documentsTemplatesNavigationMenuItem = {
    universalIdentifier: model_identifiers_1.DOCUMENTS_TEMPLATES_NAVIGATION_UNIVERSAL_IDENTIFIER,
    label: 'Documents & Templates',
    icon: 'IconTemplate',
    object: 'documentTemplate',
    position: 40,
    requiredPermissionScope: 'viewTemplates',
};
