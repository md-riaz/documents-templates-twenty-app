import { definePageLayout } from 'twenty-sdk/define';

import {
  DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from '../constants/model-identifiers';

/**
 * Page layout bound to the app's own DocumentTemplate object. Opening a
 * DocumentTemplate record shows the rich template editor instead of Twenty's
 * generic field-by-field form. See
 * `src/page-layout-tabs/document-template-editor.page-layout-tab.ts` for the
 * tab/widget that attaches the template editor to this layout.
 *
 * NOTE: the Twenty CLI discovers entities via static analysis of the
 * `export default defineXxx({...})` expression — it must be inline (not a
 * re-exported reference to a named const), and one entity per file, or the
 * entity is silently skipped.
 */
export default definePageLayout({
  universalIdentifier: DOCUMENT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Document Template',
  objectUniversalIdentifier: DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
