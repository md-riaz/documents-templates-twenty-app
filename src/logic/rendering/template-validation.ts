import { createMissingVariableError, TemplateRenderError } from './render-errors';

export type TemplateValidationOptions = {
  strictMissingVariables?: boolean;
};

export type TemplateValidationResult = {
  valid: boolean;
  errors: TemplateRenderError[];
  warnings: string[];
  referencedVariables: string[];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasPath = (context: Record<string, unknown>, path: string): boolean => {
  if (['this', '.', 'index', 'number'].includes(path)) return true;
  const parts = path.split('.');
  let current: unknown = context;
  for (const part of parts) {
    if (!isPlainObject(current) && !Array.isArray(current)) return false;
    if (!(part in (current as Record<string, unknown>))) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return current !== undefined;
};

const lineColumnAt = (source: string, index: number): { line: number; column: number } => {
  const before = source.slice(0, index).split('\n');
  return { line: before.length, column: before[before.length - 1].length + 1 };
};

const firstToken = (expression: string): string => {
  const match = expression.trim().match(/^([^\s]+)/);
  return match?.[1] ?? '';
};

const builtInHelpers = new Set(['formatDate', 'formatCurrency', 'uppercase', 'lowercase', 'default']);
const keywords = new Set(['else', 'this', '.', 'true', 'false', 'null']);

export const extractReferencedVariables = (source: string): string[] => {
  const variables = new Set<string>();
  const tokenPattern = /{{{?\s*([^#/>][^}]*)\s*}?}}/g;

  for (const match of source.matchAll(tokenPattern)) {
    const expression = match[1].trim();
    const token = firstToken(expression);
    if (!token || keywords.has(token) || builtInHelpers.has(token)) continue;
    if (/^['"-]?\d/.test(token) || token.startsWith('>')) continue;
    variables.add(token);
  }

  for (const match of source.matchAll(/{{\s*#(?:if|each)\s+([^}\s]+)[^}]*}}/g)) {
    const variable = match[1].trim();
    if (!builtInHelpers.has(variable)) variables.add(variable);
  }

  return [...variables];
};

const validateBlockSyntax = (source: string): TemplateRenderError[] => {
  const errors: TemplateRenderError[] = [];
  const stack: Array<{ name: string; index: number }> = [];
  const blockPattern = /{{\s*(#|\/)(if|each)\b[^}]*}}/g;

  for (const match of source.matchAll(blockPattern)) {
    const [, marker, name] = match;
    if (marker === '#') {
      stack.push({ name, index: match.index });
      continue;
    }

    const open = stack.pop();
    if (!open || open.name !== name) {
      const location = lineColumnAt(source, match.index);
      errors.push(
        new TemplateRenderError({
          code: 'TEMPLATE_SYNTAX_ERROR',
          message: `Unexpected closing block: ${name}`,
          userMessage: 'The template syntax is invalid. A Handlebars block is closed without a matching opener.',
          ...location,
          phase: 'validation',
        }),
      );
    }
  }

  for (const open of stack) {
    const location = lineColumnAt(source, open.index);
    errors.push(
      new TemplateRenderError({
        code: 'TEMPLATE_SYNTAX_ERROR',
        message: `Unclosed ${open.name} block`,
        userMessage: `The template syntax is invalid. The {{#${open.name}}} block is missing a closing tag.`,
        ...location,
        phase: 'validation',
      }),
    );
  }

  const withoutTriple = source.replace(/{{{[\s\S]*?}}}/g, '');
  const openTags = source.match(/{{{/g)?.length ?? 0;
  const closeTags = source.match(/}}}/g)?.length ?? 0;
  const doubleOpen = withoutTriple.match(/{{(?!{)/g)?.length ?? 0;
  const doubleClose = withoutTriple.match(/(?<!})}}(?!})/g)?.length ?? 0;
  if (openTags !== closeTags || doubleOpen !== doubleClose) {
    errors.push(
      new TemplateRenderError({
        code: 'TEMPLATE_SYNTAX_ERROR',
        message: 'Unbalanced Handlebars delimiters',
        userMessage: 'The template syntax is invalid. Check for missing {{, }}, {{{, or }}} delimiters.',
        line: 1,
        column: 1,
        phase: 'validation',
      }),
    );
  }

  return errors;
};

export const validateHandlebarsTemplate = (
  source: string,
  context: Record<string, unknown> = {},
  options: TemplateValidationOptions = {},
): TemplateValidationResult => {
  const referencedVariables = extractReferencedVariables(source);
  const errors = validateBlockSyntax(source);
  const warnings: string[] = [];

  for (const variable of referencedVariables) {
    if (!hasPath(context, variable)) {
      const error = createMissingVariableError(variable);
      if (options.strictMissingVariables) errors.push(error);
      else warnings.push(error.userMessage);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    referencedVariables,
  };
};
