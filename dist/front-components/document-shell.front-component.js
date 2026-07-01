"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentShellFrontComponent = void 0;
exports.default = DocumentShellFrontComponent;
const model_identifiers_1 = require("src/constants/model-identifiers");
exports.documentShellFrontComponent = {
    universalIdentifier: model_identifiers_1.DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
    name: 'document-shell',
    label: 'Documents Shell',
    description: 'Placeholder shell for record document generation and generated document history.',
    componentPath: './front-components/document-shell.front-component.tsx',
};
function DocumentShellFrontComponent() {
    return null;
}
