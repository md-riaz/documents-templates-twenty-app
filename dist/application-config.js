"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("twenty-sdk/define");
const universal_identifiers_1 = require("./constants/universal-identifiers");
exports.default = (0, define_1.defineApplication)({
    universalIdentifier: universal_identifiers_1.APPLICATION_UNIVERSAL_IDENTIFIER,
    defaultRoleUniversalIdentifier: 'a2f3882b-4d9a-5b87-9f9d-0d0c70b17501',
    displayName: universal_identifiers_1.APP_DISPLAY_NAME,
    description: universal_identifiers_1.APP_DESCRIPTION,
    category: universal_identifiers_1.MARKETPLACE_METADATA.category,
    author: universal_identifiers_1.MARKETPLACE_METADATA.publisher,
    websiteUrl: universal_identifiers_1.MARKETPLACE_METADATA.documentationUrl,
    issueReportUrl: universal_identifiers_1.MARKETPLACE_METADATA.supportUrl,
    screenshots: universal_identifiers_1.MARKETPLACE_METADATA.screenshots,
});
