"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAnyPermissionScope = exports.assertPermissionScope = exports.hasPermissionScope = exports.isDocumentsTemplatesPermissionScope = exports.PermissionDeniedError = void 0;
const scopes_1 = require("./scopes");
class PermissionDeniedError extends Error {
    requiredScope;
    constructor(requiredScope) {
        super(`Missing required Documents & Templates permission scope: ${requiredScope}`);
        this.requiredScope = requiredScope;
        this.name = 'PermissionDeniedError';
    }
}
exports.PermissionDeniedError = PermissionDeniedError;
const isDocumentsTemplatesPermissionScope = (scope) => scopes_1.DOCUMENTS_TEMPLATES_PERMISSION_SCOPES.includes(scope);
exports.isDocumentsTemplatesPermissionScope = isDocumentsTemplatesPermissionScope;
const scopesForPrincipal = (principal) => [
    ...(principal.permissionScopes ?? []),
    ...(principal.scopes ?? []),
    ...(principal.role?.permissionScopes ?? []),
    ...(principal.role?.scopes ?? []),
];
const hasPermissionScope = (principal, requiredScope) => {
    if (!principal)
        return false;
    return scopesForPrincipal(principal).includes(requiredScope);
};
exports.hasPermissionScope = hasPermissionScope;
const assertPermissionScope = (principal, requiredScope) => {
    if (!(0, exports.hasPermissionScope)(principal, requiredScope)) {
        throw new PermissionDeniedError(requiredScope);
    }
};
exports.assertPermissionScope = assertPermissionScope;
const assertAnyPermissionScope = (principal, requiredScopes) => {
    if (!requiredScopes.some((scope) => (0, exports.hasPermissionScope)(principal, scope))) {
        throw new PermissionDeniedError(requiredScopes[0]);
    }
};
exports.assertAnyPermissionScope = assertAnyPermissionScope;
