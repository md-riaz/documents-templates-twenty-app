import { validateHandlebarsTemplate } from './rendering/template-validation';

export type ValidateTemplateInput = {
  htmlSource: string;
  context?: Record<string, unknown>;
  strictMissingVariables?: boolean;
};

export type ValidateTemplateOutput = {
  valid: boolean;
  errors: Array<{ code: string; path?: string; message: string }>;
  warnings: string[];
  referencedVariables: string[];
};

export const validateTemplateLogic = (input: ValidateTemplateInput): ValidateTemplateOutput => {
  const { htmlSource, context = {}, strictMissingVariables = false } = input;

  const result = validateHandlebarsTemplate(htmlSource, context, {
    strictMissingVariables,
  });

  return {
    valid: result.errors.length === 0,
    errors: result.errors.map((e) => ({
      code: e.code,
      path: e.path,
      message: e.message,
    })),
    warnings: result.warnings,
    referencedVariables: result.referencedVariables,
  };
};
