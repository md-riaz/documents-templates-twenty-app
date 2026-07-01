export type TemplateContext = Record<string, unknown>;
export type TemplateHelper = (
  value: unknown,
  ...args: unknown[]
) => unknown;

export type HelperRegistry = {
  register(name: string, helper: TemplateHelper): void;
  has(name: string): boolean;
  invoke(name: string, args: unknown[], context: TemplateContext): unknown;
  entries(): ReadonlyMap<string, TemplateHelper>;
};

const assertHelperName = (name: string): void => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid template helper name: ${name}`);
  }
};

export const createHelperRegistry = (
  initialHelpers: Record<string, TemplateHelper> = {},
): HelperRegistry => {
  const helpers = new Map<string, TemplateHelper>();

  const registry: HelperRegistry = {
    register(name, helper) {
      assertHelperName(name);
      if (helpers.has(name)) {
        throw new Error(`Template helper “${name}” is already registered.`);
      }
      helpers.set(name, helper);
    },
    has(name) {
      return helpers.has(name);
    },
    invoke(name, args, context) {
      const helper = helpers.get(name);
      if (!helper) throw new Error(`Unknown template helper: ${name}`);
      return helper.apply(context, args as [unknown, ...unknown[]]);
    },
    entries() {
      return helpers;
    },
  };

  for (const [name, helper] of Object.entries(initialHelpers)) {
    registry.register(name, helper);
  }

  return registry;
};

const toStringValue = (value: unknown): string =>
  value == null ? '' : String(value);

export const createDefaultHelperRegistry = (): HelperRegistry =>
  createHelperRegistry({
    formatDate(value: unknown, locale: unknown = 'en-US', options?: unknown): string {
      if (value == null || value === '') return '';
      const date = value instanceof Date ? value : new Date(String(value));
      if (Number.isNaN(date.getTime())) return '';
      const formatOptions =
        options && typeof options === 'object'
          ? (options as Intl.DateTimeFormatOptions)
          : undefined;
      return new Intl.DateTimeFormat(String(locale || 'en-US'), formatOptions).format(date);
    },

    formatCurrency(value: unknown, currency: unknown = 'USD', locale: unknown = 'en-US'): string {
      const amount = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(amount)) return '';
      return new Intl.NumberFormat(String(locale || 'en-US'), {
        style: 'currency',
        currency: String(currency || 'USD'),
      }).format(amount);
    },

    uppercase(value: unknown): string {
      return toStringValue(value).toUpperCase();
    },

    lowercase(value: unknown): string {
      return toStringValue(value).toLowerCase();
    },

    default(value: unknown, fallback: unknown = ''): unknown {
      return value == null || value === '' ? fallback : value;
    },
  });
