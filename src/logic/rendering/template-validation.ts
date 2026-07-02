import Handlebars from 'handlebars';
import { createMissingVariableError, mapTemplateRenderError, TemplateRenderError } from './render-errors';

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
  if (path === 'this' || path === '.') return true;
  const parts = path.split('.');
  let current: unknown = context;
  for (const part of parts) {
    if (!isPlainObject(current) && !Array.isArray(current)) return false;
    if (!(part in (current as Record<string, unknown>))) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return current !== undefined;
};

// Helpers registered by createDefaultHelperRegistry(). Used only to decide
// whether a bare `{{name}}` mustache with no arguments most likely refers to
// a helper call (e.g. `{{uppercase}}`) rather than a context variable, since
// template-validation has no visibility into a caller's custom HelperRegistry.
const BUILT_IN_HELPER_NAMES = new Set(['formatDate', 'formatCurrency', 'uppercase', 'lowercase', 'default']);

/**
 * Walks a real Handlebars AST (from `Handlebars.parse`) and collects every
 * data path referenced by the template: mustache/block/partial arguments,
 * hash values, and subexpression arguments. Handlebars helper/block names
 * themselves (the `path` of a MustacheStatement/BlockStatement/SubExpression
 * that is being *called*, e.g. `if`, `each`, `with`, `uppercase`) are
 * intentionally excluded, as are `@data` variables (`@index`, `@key`, ...)
 * which are always supplied by Handlebars rather than the template context.
 */
class ReferencedVariableCollector extends Handlebars.Visitor {
  public readonly variables = new Set<string>();

  PathExpression(path: hbs.AST.PathExpression): void {
    if (path.data) return;
    if (!path.parts || path.parts.length === 0) return;
    this.variables.add(path.parts.join('.'));
  }

  MustacheStatement(mustache: hbs.AST.MustacheStatement): void {
    const hasArgs = mustache.params.length > 0 || Boolean(mustache.hash?.pairs?.length);
    const path = mustache.path as hbs.AST.PathExpression;
    const isLikelyBuiltInHelperCall = path?.type === 'PathExpression' && BUILT_IN_HELPER_NAMES.has(path.original);
    if (!hasArgs && !isLikelyBuiltInHelperCall) {
      this.accept(mustache.path);
    }
    this.acceptArray(mustache.params);
    this.acceptKey(mustache, 'hash');
  }

  BlockStatement(block: hbs.AST.BlockStatement): void {
    // block.path (if/each/with/unless/...) is a block-helper name, never a
    // context variable, so it is intentionally not visited here.
    this.acceptArray(block.params);
    this.acceptKey(block, 'hash');
    this.acceptKey(block, 'program');
    this.acceptKey(block, 'inverse');
  }

  SubExpression(sexpr: hbs.AST.SubExpression): void {
    this.acceptArray(sexpr.params);
    this.acceptKey(sexpr, 'hash');
  }

  PartialStatement(partial: hbs.AST.PartialStatement): void {
    this.acceptArray(partial.params);
    this.acceptKey(partial, 'hash');
  }

  PartialBlockStatement(partial: hbs.AST.PartialBlockStatement): void {
    this.acceptArray(partial.params);
    this.acceptKey(partial, 'hash');
    this.acceptKey(partial, 'program');
  }

  // Decorators (`{{* foo}}` / `{{#* foo}}`) are not used by this app; skip
  // them defensively rather than misreading their name as a variable.
  Decorator(): void {}
  DecoratorBlock(): void {}
}

export const extractReferencedVariables = (source: string): string[] => {
  const ast = Handlebars.parse(source);
  const collector = new ReferencedVariableCollector();
  collector.accept(ast);
  return [...collector.variables];
};

export const validateHandlebarsTemplate = (
  source: string,
  context: Record<string, unknown> = {},
  options: TemplateValidationOptions = {},
): TemplateValidationResult => {
  let ast: hbs.AST.Program;
  try {
    ast = Handlebars.parse(source);
  } catch (error) {
    return {
      valid: false,
      errors: [mapTemplateRenderError(error, 'validation')],
      warnings: [],
      referencedVariables: [],
    };
  }

  const collector = new ReferencedVariableCollector();
  collector.accept(ast);
  const referencedVariables = [...collector.variables];

  const errors: TemplateRenderError[] = [];
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
