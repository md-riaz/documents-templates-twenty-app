export type TemplateErrorCode =
  | 'TEMPLATE_SYNTAX_ERROR'
  | 'MISSING_REQUIRED_VARIABLE'
  | 'UNKNOWN_HELPER'
  | 'INVALID_BLOCK'
  | 'TEMPLATE_RENDER_ERROR';

export type TemplateRenderErrorDetails = {
  code: TemplateErrorCode;
  message: string;
  userMessage: string;
  line?: number;
  column?: number;
  path?: string;
  phase?: 'validation' | 'compile' | 'render';
};

export class TemplateRenderError extends Error {
  public readonly code: TemplateErrorCode;
  public readonly userMessage: string;
  public readonly line?: number;
  public readonly column?: number;
  public readonly path?: string;
  public readonly phase?: 'validation' | 'compile' | 'render';

  constructor(details: TemplateRenderErrorDetails) {
    super(details.message);
    this.name = 'TemplateRenderError';
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.line = details.line;
    this.column = details.column;
    this.path = details.path;
    this.phase = details.phase;
  }
}

export const createMissingVariableError = (path: string): TemplateRenderError =>
  new TemplateRenderError({
    code: 'MISSING_REQUIRED_VARIABLE',
    message: `Missing required template variable: ${path}`,
    userMessage: `The template references “${path}”, but that value is not available for this record.`,
    path,
    phase: 'validation',
  });

const lineColumnFromMessage = (message: string): { line?: number; column?: number } => {
  const match = message.match(/line\s+(\d+)(?:[^\d]+column\s+(\d+))?/i);
  return {
    line: match?.[1] ? Number(match[1]) : undefined,
    column: match?.[2] ? Number(match[2]) : undefined,
  };
};

export const mapTemplateRenderError = (
  error: unknown,
  phase: 'compile' | 'render' | 'validation' = 'render',
): TemplateRenderError => {
  if (error instanceof TemplateRenderError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const location = lineColumnFromMessage(message);
  const lower = message.toLowerCase();

  if (
    phase === 'compile' ||
    // `validateHandlebarsTemplate` calls `Handlebars.parse()` directly during
    // the "validation" phase, so any error surfaced there is definitionally
    // a template syntax error regardless of its message wording.
    phase === 'validation' ||
    lower.includes('unexpected') ||
    lower.includes('unclosed') ||
    lower.includes('mismatched') ||
    lower.includes('parse')
  ) {
    return new TemplateRenderError({
      code: 'TEMPLATE_SYNTAX_ERROR',
      message,
      userMessage: 'The template syntax is invalid. Check Handlebars tags, block openings, and closing tags.',
      line: location.line,
      column: location.column,
      phase,
    });
  }

  if (lower.includes('unknown template helper') || lower.includes('missing helper')) {
    return new TemplateRenderError({
      code: 'UNKNOWN_HELPER',
      message,
      userMessage: 'The template uses a helper that is not registered.',
      phase,
    });
  }

  return new TemplateRenderError({
    code: 'TEMPLATE_RENDER_ERROR',
    message,
    userMessage: 'The template could not be rendered. Review the template and source data, then try again.',
    phase,
  });
};
