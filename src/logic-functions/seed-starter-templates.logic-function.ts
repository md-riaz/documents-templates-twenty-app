import { defineLogicFunction } from 'twenty-sdk/define';
import { jsonSchemaToInputSchema } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { SEED_STARTER_TEMPLATES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from '../constants/model-identifiers';
import { starterTemplates } from '../seed/starter-templates';

export type SeedStarterTemplatesInput = {
  force?: boolean;
};

export type SeedStarterTemplatesOutput = {
  created: string[];
  skipped: string[];
};

const inputSchema = jsonSchemaToInputSchema({
  type: 'object',
  properties: {
    force: { type: 'boolean', label: 'Force re-create even if templates already exist' },
  },
  required: [],
});

const outputSchema = jsonSchemaToInputSchema({
  type: 'object',
  properties: {
    created: { type: 'array', items: { type: 'string' }, label: 'Created templates' },
    skipped: { type: 'array', items: { type: 'string' }, label: 'Skipped templates' },
  },
});

export const runSeedStarterTemplates = async (
  input: SeedStarterTemplatesInput = {},
  deps: { client?: CoreApiClient } = {},
): Promise<SeedStarterTemplatesOutput> => {
  const client = deps.client ?? new CoreApiClient();
  const created: string[] = [];
  const skipped: string[] = [];

  for (const template of starterTemplates) {
    if (!input.force) {
      const existing = await client.query({
        documentTemplates: {
          __args: { filter: { name: { eq: template.name } } },
          edges: { node: { id: true, name: true } },
        },
      });

      const nodes = existing.documentTemplates?.edges ?? [];
      if (nodes.length > 0) {
        skipped.push(template.name);
        continue;
      }
    }

    await client.mutation({
      createDocumentTemplate: {
        __args: {
          data: {
            name: template.name,
            htmlSource: template.htmlSource,
            previewData: template.previewData,
            boundObjectName: template.boundObjectName,
            description: { markdown: template.description },
            status: 'DRAFT',
          },
        },
        id: true,
      },
    });

    created.push(template.name);
  }

  return { created, skipped };
};

// NOTE: the Twenty CLI discovers entities via static analysis of the
// `export default defineXxx({...})` expression — it must be inline (not a
// re-exported reference to a named const) or the entity is silently skipped.
export default defineLogicFunction({
  universalIdentifier: SEED_STARTER_TEMPLATES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'Seed Starter Templates',
  description: 'Create starter document templates if they do not already exist. Use force=true to re-create even when a template with the same name is present.',
  workflowActionTriggerSettings: {
    label: 'Seed Starter Templates',
    icon: 'IconSeedling',
    inputSchema,
    outputSchema,
  },
  handler: (input: SeedStarterTemplatesInput) => runSeedStarterTemplates(input),
});
