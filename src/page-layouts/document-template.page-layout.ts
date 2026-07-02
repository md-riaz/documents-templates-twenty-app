import { definePageLayout } from 'twenty-sdk/define';

import {
  DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  DOCUMENT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from '../constants/model-identifiers';

/**
 * Page layout bound to the app's own DocumentTemplate object. Opening a
 * DocumentTemplate record shows two tabs: a native "Fields" tab (Twenty's
 * standard field editor) and an "Editor" tab hosting the rich template
 * editor front component. See
 * `src/page-layout-tabs/document-template-fields.page-layout-tab.ts` and
 * `src/page-layout-tabs/document-template-editor.page-layout-tab.ts`.
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
