"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("twenty-sdk/define");
const model_identifiers_1 = require("src/constants/model-identifiers");
const generateDocumentCommandMenuItem = (0, define_1.defineCommandMenuItem)({
    universalIdentifier: model_identifiers_1.GENERATE_DOCUMENT_COMMAND_UNIVERSAL_IDENTIFIER,
    label: 'Generate Document',
    shortLabel: 'Generate',
    icon: 'IconFileText',
    availabilityType: 'GLOBAL_OBJECT_CONTEXT',
    frontComponentUniversalIdentifier: model_identifiers_1.DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
exports.default = generateDocumentCommandMenuItem;
