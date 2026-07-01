export type ContextProviderApi = {
  getRecord?: (objectName: string, id: string) => Promise<Record<string, unknown> | null | undefined>;
};

export type ContextProviderPermissions = {
  readableFields?: Record<string, string[]>;
};

export type ContextProviderInput = {
  primaryObjectType: string;
  primaryRecordId: string;
  api?: ContextProviderApi;
  permissions?: ContextProviderPermissions;
  currentUser?: Record<string, unknown>;
  workspace?: Record<string, unknown>;
};

export type ContextProviderResult = {
  context: Record<string, unknown>;
  warnings: string[];
};

export type ContextProvider = (input: ContextProviderInput) => Promise<ContextProviderResult> | ContextProviderResult;

export const normalizeProviderName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Context provider name is required.');
  return `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
};

const providerKey = (name: string): string => normalizeProviderName(name).toLowerCase();

const filterReadableFields = (
  objectName: string,
  record: Record<string, unknown>,
  permissions?: ContextProviderPermissions,
): { record: Record<string, unknown>; warnings: string[] } => {
  const readable = permissions?.readableFields?.[objectName];
  if (!readable) return { record, warnings: [] };

  const allowed = new Set(readable);
  const filtered: Record<string, unknown> = {};
  const omitted: string[] = [];
  for (const [field, value] of Object.entries(record)) {
    if (allowed.has(field)) filtered[field] = value;
    else omitted.push(field);
  }

  return {
    record: filtered,
    warnings: omitted.length ? [`Omitted unreadable field(s) from ${objectName}: ${omitted.join(', ')}`] : [],
  };
};

export const loadGenericRecordContext = async (input: ContextProviderInput): Promise<ContextProviderResult> => {
  const objectName = normalizeProviderName(input.primaryObjectType);
  const warnings: string[] = [];
  let record: Record<string, unknown> = {};

  try {
    record = (await input.api?.getRecord?.(objectName, input.primaryRecordId)) ?? { id: input.primaryRecordId };
  } catch (error) {
    warnings.push(`Could not load ${objectName} context: ${error instanceof Error ? error.message : String(error)}`);
  }

  const filtered = filterReadableFields(objectName, record, input.permissions);
  warnings.push(...filtered.warnings);

  return {
    context: {
      [objectName]: filtered.record,
      primary: { objectType: objectName, record: filtered.record },
      ...(input.currentUser ? { currentUser: input.currentUser } : {}),
      ...(input.workspace ? { workspace: input.workspace } : {}),
    },
    warnings,
  };
};

export class ContextProviderRegistry {
  private readonly providers = new Map<string, ContextProvider>();

  constructor(providers: Record<string, ContextProvider> = {}) {
    for (const [name, provider] of Object.entries(providers)) {
      this.register(name, provider);
    }
  }

  register(name: string, provider: ContextProvider): void {
    this.providers.set(providerKey(name), provider);
  }

  has(name: string): boolean {
    return this.providers.has(providerKey(name));
  }

  async load(input: ContextProviderInput): Promise<ContextProviderResult> {
    const objectName = normalizeProviderName(input.primaryObjectType);
    const provider = this.providers.get(providerKey(objectName));

    if (!provider) {
      const fallback = await loadGenericRecordContext({ ...input, primaryObjectType: objectName });
      return {
        context: fallback.context,
        warnings: [`No context provider registered for ${objectName}; used generic primary context.`, ...fallback.warnings],
      };
    }

    try {
      const result = await provider({ ...input, primaryObjectType: objectName });
      return { context: result.context ?? {}, warnings: result.warnings ?? [] };
    } catch (error) {
      return loadGenericRecordContext({ ...input, primaryObjectType: objectName }).then((fallback) => ({
        context: fallback.context,
        warnings: [`Could not load ${objectName} context: ${error instanceof Error ? error.message : String(error)}`, ...fallback.warnings],
      }));
    }
  }
}

export const createContextProviderRegistry = (options: {
  providers?: Record<string, ContextProvider>;
  includeDefaultProviders?: boolean;
} = {}): ContextProviderRegistry => {
  const providers = { ...(options.providers ?? {}) };

  if (options.includeDefaultProviders) {
    for (const name of ['company', 'person', 'opportunity', 'task', 'note', 'calendarEvent']) {
      providers[name] = (input: ContextProviderInput) => loadGenericRecordContext({ ...input, primaryObjectType: name });
    }
  }

  return new ContextProviderRegistry(providers);
};

export const registerContextProvider = (
  name: string,
  provider: ContextProvider,
  registry = defaultContextProviderRegistry,
): void => {
  registry.register(name, provider);
};

export const defaultContextProviderRegistry = new ContextProviderRegistry();
