import {
  DOCUMENTS_TEMPLATES_PERMISSION_SCOPES,
  type DocumentsTemplatesPermissionScope,
} from './scopes';

export type PermissionPrincipal = {
  permissionScopes?: readonly string[];
  scopes?: readonly string[];
  role?: { permissionScopes?: readonly string[]; scopes?: readonly string[] };
};

export class PermissionDeniedError extends Error {
  constructor(public readonly requiredScope: DocumentsTemplatesPermissionScope) {
    super(`Missing required Documents & Templates permission scope: ${requiredScope}`);
    this.name = 'PermissionDeniedError';
  }
}

export const isDocumentsTemplatesPermissionScope = (
  scope: string,
): scope is DocumentsTemplatesPermissionScope =>
  DOCUMENTS_TEMPLATES_PERMISSION_SCOPES.includes(
    scope as DocumentsTemplatesPermissionScope,
  );

const scopesForPrincipal = (principal: PermissionPrincipal): readonly string[] => [
  ...(principal.permissionScopes ?? []),
  ...(principal.scopes ?? []),
  ...(principal.role?.permissionScopes ?? []),
  ...(principal.role?.scopes ?? []),
];

export const hasPermissionScope = (
  principal: PermissionPrincipal | undefined,
  requiredScope: DocumentsTemplatesPermissionScope,
): boolean => {
  if (!principal) return false;
  return scopesForPrincipal(principal).includes(requiredScope);
};

export const assertPermissionScope = (
  principal: PermissionPrincipal | undefined,
  requiredScope: DocumentsTemplatesPermissionScope,
): void => {
  if (!hasPermissionScope(principal, requiredScope)) {
    throw new PermissionDeniedError(requiredScope);
  }
};

export const assertAnyPermissionScope = (
  principal: PermissionPrincipal | undefined,
  requiredScopes: readonly DocumentsTemplatesPermissionScope[],
): void => {
  if (!requiredScopes.some((scope) => hasPermissionScope(principal, scope))) {
    throw new PermissionDeniedError(requiredScopes[0]);
  }
};
