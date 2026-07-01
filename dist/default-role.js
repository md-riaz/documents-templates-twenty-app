"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const define_1 = require("twenty-sdk/define");
const universal_identifiers_1 = require("./constants/universal-identifiers");
const scopes_1 = require("./permissions/scopes");
exports.default = (0, define_1.defineApplicationRole)({
    universalIdentifier: universal_identifiers_1.DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
    name: `${universal_identifiers_1.APP_DISPLAY_NAME} app role`,
    label: `${universal_identifiers_1.APP_DISPLAY_NAME} app role`,
    description: 'Default role used by Documents & Templates app logic functions.',
    permissionFlags: scopes_1.DOCUMENTS_TEMPLATES_PERMISSION_SCOPES.map((scope) => ({
        flag: scope,
        value: true,
    })),
});
