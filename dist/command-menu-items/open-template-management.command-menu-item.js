"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("twenty-sdk/define");
const model_identifiers_1 = require("src/constants/model-identifiers");
const openTemplateManagementCommandMenuItem = (0, define_1.defineCommandMenuItem)({
    universalIdentifier: model_identifiers_1.OPEN_TEMPLATE_MANAGEMENT_COMMAND_UNIVERSAL_IDENTIFIER,
    label: 'Open Template Management',
    shortLabel: 'Templates',
    icon: 'IconTemplate',
    availabilityType: 'GLOBAL',
    frontComponentUniversalIdentifier: model_identifiers_1.DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
exports.default = openTemplateManagementCommandMenuItem;
