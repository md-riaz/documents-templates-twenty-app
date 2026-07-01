import { DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/model-identifiers';

export const documentShellFrontComponent = {
  universalIdentifier: DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'document-shell',
  label: 'Documents Shell',
  description: 'Placeholder shell for record document generation and generated document history.',
  componentPath: './front-components/document-shell.front-component.tsx',
};

export default function DocumentShellFrontComponent() {
  return null;
}
