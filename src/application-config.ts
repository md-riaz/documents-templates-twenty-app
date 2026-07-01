import { defineApplication } from 'twenty-sdk/define';

import {
  APPLICATION_UNIVERSAL_IDENTIFIER,
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  MARKETPLACE_METADATA,
} from './constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  defaultRoleUniversalIdentifier: 'a2f3882b-4d9a-5b87-9f9d-0d0c70b17501',
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  category: MARKETPLACE_METADATA.category,
  author: MARKETPLACE_METADATA.publisher,
  websiteUrl: MARKETPLACE_METADATA.documentationUrl,
  issueReportUrl: MARKETPLACE_METADATA.supportUrl,
  screenshots: MARKETPLACE_METADATA.screenshots,
});
