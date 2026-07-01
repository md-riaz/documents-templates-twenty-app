import {
  type ContextProvider,
  type ContextProviderInput,
  type ContextProviderResult,
  loadGenericRecordContext,
  normalizeProviderName,
} from './provider-registry';

export const DEFAULT_CONTEXT_PROVIDER_NAMES = [
  'company',
  'person',
  'opportunity',
  'task',
  'note',
  'calendarEvent',
] as const;

export type DefaultContextProviderName = (typeof DEFAULT_CONTEXT_PROVIDER_NAMES)[number];

const loadStandardContext = async (
  expectedObjectType: DefaultContextProviderName,
  input: ContextProviderInput,
): Promise<ContextProviderResult> => {
  const objectName = normalizeProviderName(input.primaryObjectType || expectedObjectType) as DefaultContextProviderName;
  return loadGenericRecordContext({ ...input, primaryObjectType: objectName });
};

export const createDefaultContextProviders = (): Record<DefaultContextProviderName, ContextProvider> => ({
  company: (input) => loadStandardContext('company', input),
  person: (input) => loadStandardContext('person', input),
  opportunity: (input) => loadStandardContext('opportunity', input),
  task: (input) => loadStandardContext('task', input),
  note: (input) => loadStandardContext('note', input),
  calendarEvent: (input) => loadStandardContext('calendarEvent', input),
});

export const loadDefaultRecordContext = async (input: ContextProviderInput): Promise<ContextProviderResult> => {
  const objectName = normalizeProviderName(input.primaryObjectType);
  const providers = createDefaultContextProviders();
  const provider = providers[objectName as DefaultContextProviderName];
  return provider ? provider({ ...input, primaryObjectType: objectName }) : loadGenericRecordContext({ ...input, primaryObjectType: objectName });
};
