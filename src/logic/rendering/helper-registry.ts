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

/**
 * Real Handlebars always calls a registered helper with the helper's
 * positional arguments followed by a trailing `HelperOptions` object
 * (`{ fn, inverse, hash, data, ... }`). Our helpers are plain functions with
 * a simpler calling convention (`helper(value, ...args)`), so this adapter
 * bridges the two: it strips the trailing options object and, only when the
 * template author actually supplied hash arguments (e.g.
 * `{{formatDate value weekday="short"}}`), forwards `options.hash` as an
 * extra trailing positional argument. Helpers that rely on positional
 * default parameters (e.g. `(value, left = '[', right = ']')`) keep working
 * unmodified when no hash arguments are present.
 */
const isHandlebarsHelperOptions = (
  value: unknown,
): value is { hash?: Record<string, unknown>; data?: unknown; fn?: unknown; inverse?: unknown } =>
  typeof value === 'object' &&
  value !== null &&
  'hash' in value &&
  'lookupProperty' in (value as Record<string, unknown>);

export const adaptHelperForHandlebars = (helper: TemplateHelper): ((...args: unknown[]) => unknown) =>
  function adaptedHelper(this: TemplateContext, ...callArgs: unknown[]): unknown {
    const last = callArgs[callArgs.length - 1];
    if (isHandlebarsHelperOptions(last)) {
      const positional = callArgs.slice(0, -1);
      const hash = last.hash ?? {};
      const finalArgs = Object.keys(hash).length > 0 ? [...positional, hash] : positional;
      return helper.apply(this, finalArgs as [unknown, ...unknown[]]);
    }
    return helper.apply(this, callArgs as [unknown, ...unknown[]]);
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
