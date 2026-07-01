"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("twenty-sdk/define");
const model_identifiers_1 = require("src/constants/model-identifiers");
exports.default = (0, define_1.defineNavigationMenuItem)({
    universalIdentifier: model_identifiers_1.GENERATED_DOCUMENTS_NAVIGATION_UNIVERSAL_IDENTIFIER,
    type: define_1.NavigationMenuItemType.VIEW,
    name: 'Generated Documents',
    icon: 'IconFileText',
    position: 41,
    viewUniversalIdentifier: model_identifiers_1.GENERATED_DOCUMENT_VIEW_UNIVERSAL_IDENTIFIER,
});
