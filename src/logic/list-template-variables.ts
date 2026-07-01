export type ListTemplateVariablesInput = {
  htmlSource: string;
};

export type TemplateVariableInfo = {
  name: string;
  path: string[];
  isHelper: boolean;
};

const builtInHelpers = new Set([
  'formatDate',
  'formatCurrency',
  'uppercase',
  'lowercase',
  'default',
]);

const keywords = new Set(['else', 'this', '.', 'true', 'false', 'null']);

const isVariableToken = (token: string): boolean => {
  if (!token || keywords.has(token) || builtInHelpers.has(token)) return false;
  if (/^['"-]?\d/.test(token)) return false;
  if (token.startsWith('#') || token.startsWith('/') || token.startsWith('>')) return false;
  return true;
};

export const listTemplateVariablesLogic = (
  input: ListTemplateVariablesInput,
): TemplateVariableInfo[] => {
  const { htmlSource } = input;
  const variables = new Set<string>();
  const tokenPattern = /{{{?\s*([^#/>][^}]*)\s*}?}}/g;

  for (const match of htmlSource.matchAll(tokenPattern)) {
    const expression = match[1].trim();
    const tokens = expression.split(/\s+/).filter(Boolean);

    for (const token of tokens) {
      if (isVariableToken(token)) {
        variables.add(token);
      }
    }
  }

  return Array.from(variables).map((name) => ({
    name,
    path: name.split('.'),
    isHelper: builtInHelpers.has(name),
  }));
};
