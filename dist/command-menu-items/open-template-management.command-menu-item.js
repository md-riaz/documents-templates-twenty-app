"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openTemplateManagementCommandMenuItem = void 0;
const model_identifiers_1 = require("src/constants/model-identifiers");
exports.openTemplateManagementCommandMenuItem = {
    universalIdentifier: model_identifiers_1.OPEN_TEMPLATE_MANAGEMENT_COMMAND_UNIVERSAL_IDENTIFIER,
    label: 'Open Template Management',
    icon: 'IconTemplate',
    section: 'Documents & Templates',
    route: '/objects/documentTemplate',
    requiredPermissionScope: 'viewTemplates',
};
