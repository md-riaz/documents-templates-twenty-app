"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("twenty-sdk/define");
const model_identifiers_1 = require("src/constants/model-identifiers");
exports.default = (0, define_1.defineNavigationMenuItem)({
    universalIdentifier: model_identifiers_1.DOCUMENTS_TEMPLATES_NAVIGATION_UNIVERSAL_IDENTIFIER,
    type: define_1.NavigationMenuItemType.VIEW,
    name: 'Documents & Templates',
    icon: 'IconTemplate',
    position: 40,
    viewUniversalIdentifier: model_identifiers_1.DOCUMENT_TEMPLATE_VIEW_UNIVERSAL_IDENTIFIER,
});
