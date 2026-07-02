import { defineCommandMenuItem } from 'twenty-sdk/define';

import {
  GENERATE_DOCUMENT_COMMAND_UNIVERSAL_IDENTIFIER,
  GENERATE_DOCUMENT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from '../constants/model-identifiers';

/**
 * Record-selection command that opens the Generate Document front component.
 *
 * `availabilityObjectUniversalIdentifier` is deliberately omitted so the command
 * is available from record selection on ANY object type (standard or custom)
 * with zero per-object configuration.
 *
 * NOTE: the Twenty CLI discovers entities via static analysis of the
 * `export default defineXxx({...})` expression — it must be inline (not a
 * re-exported reference to a named const) or the entity is silently skipped.
 */
export default defineCommandMenuItem({
  universalIdentifier: GENERATE_DOCUMENT_COMMAND_UNIVERSAL_IDENTIFIER,
  label: 'Generate Document',
  shortLabel: 'Generate',
  availabilityType: 'RECORD_SELECTION',
  frontComponentUniversalIdentifier: GENERATE_DOCUMENT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
