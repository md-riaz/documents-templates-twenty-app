import Handlebars from 'handlebars';
import {
  adaptHelperForHandlebars,
  createDefaultHelperRegistry,
  type HelperRegistry,
  type TemplateContext,
} from './helper-registry';
import {
  mapTemplateRenderError,
  type TemplateRenderError,
} from './render-errors';
import { validateHandlebarsTemplate } from './template-validation';

export type RenderHandlebarsTemplateInput = {
  htmlSource: string;
  context?: TemplateContext;
  helpers?: HelperRegistry;
  partials?: Record<string, string>;
  strictMissingVariables?: boolean;
};

export type RenderHandlebarsTemplateOutput = {
  html: string;
  context: TemplateContext;
  warnings: string[];
  errors: TemplateRenderError[];
};

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/**
 * Builds an isolated Handlebars environment (via `Handlebars.create()`) so
 * that helpers/partials registered for one render never leak into another
 * render happening concurrently, then registers the supplied helpers and
 * partials onto it.
 */
const createRuntime = (
  helpers: HelperRegistry,
  partials: Record<string, string>,
): typeof Handlebars => {
  const runtime = Handlebars.create();
  for (const [name, helper] of helpers.entries()) {
    runtime.registerHelper(name, adaptHelperForHandlebars(helper));
  }
  for (const [name, source] of Object.entries(partials)) {
    runtime.registerPartial(name, source);
  }
  return runtime;
};

export const renderHandlebarsTemplate = ({
  htmlSource,
  context = {},
  helpers = createDefaultHelperRegistry(),
  partials = {},
  strictMissingVariables = false,
}: RenderHandlebarsTemplateInput): RenderHandlebarsTemplateOutput => {
  const validation = validateHandlebarsTemplate(htmlSource, context, { strictMissingVariables });

  if (!validation.valid && validation.errors.some((error) => error.code === 'TEMPLATE_SYNTAX_ERROR')) {
    return { html: '', context, warnings: [], errors: validation.errors };
  }

  const runtime = createRuntime(helpers, partials);

  let template: Handlebars.TemplateDelegate<TemplateContext>;
  try {
    template = runtime.compile(htmlSource);
  } catch (error) {
    return { html: '', context, warnings: [], errors: [mapTemplateRenderError(error, 'compile')] };
  }

  let renderedRaw: string;
  try {
    renderedRaw = template(context);
  } catch (error) {
    return { html: '', context, warnings: [], errors: [mapTemplateRenderError(error, 'render')] };
  }

  const errors = strictMissingVariables ? validation.errors : [];
  const warnings = strictMissingVariables ? [] : validation.warnings;

  return {
    html: errors.length ? '' : renderedRaw,
    context,
    warnings,
    errors,
  };
};
