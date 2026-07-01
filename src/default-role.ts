import { defineApplicationRole } from 'twenty-sdk/define';

import {
  APP_DISPLAY_NAME,
  DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
} from './constants/universal-identifiers';
import { DOCUMENTS_TEMPLATES_PERMISSION_SCOPES } from './permissions/scopes';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  name: `${APP_DISPLAY_NAME} app role`,
  label: `${APP_DISPLAY_NAME} app role`,
  description: 'Default role used by Documents & Templates app logic functions.',
  permissionFlags: DOCUMENTS_TEMPLATES_PERMISSION_SCOPES.map((scope) => ({
    flag: scope,
    value: true,
  })),
} as Parameters<typeof defineApplicationRole>[0]);
