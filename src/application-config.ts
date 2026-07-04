import { defineApplication } from 'twenty-sdk/define';

import {
  APPLICATION_UNIVERSAL_IDENTIFIER,
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  MARKETPLACE_METADATA,
} from './constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  category: MARKETPLACE_METADATA.category,
  author: MARKETPLACE_METADATA.publisher,
  websiteUrl: MARKETPLACE_METADATA.documentationUrl,
  issueReportUrl: MARKETPLACE_METADATA.supportUrl,
  screenshots: MARKETPLACE_METADATA.screenshots,
});
