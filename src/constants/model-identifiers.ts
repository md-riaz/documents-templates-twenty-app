export const TEMPLATE_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER = 'c1cfa984-c920-4a63-8b26-e7a5255fb7e3';
export const DOCUMENT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER = '7adbea9b-edc1-4e1e-b259-f7f6c985fa04';
export const TEMPLATE_VERSION_OBJECT_UNIVERSAL_IDENTIFIER = 'eff96117-492b-4e89-9b9f-66492786ad53';
export const DOCUMENT_OBJECT_UNIVERSAL_IDENTIFIER = '6353463f-7540-4cf9-9898-85a4984d976c';

export const TEMPLATE_CATEGORY_FIELDS = {
  name: '58a4c3b6-e337-4185-bd6f-70fbe2cbac51',
  color: 'b45ec000-37d9-493c-b8b9-dae8b178f702',
  icon: '59f50238-7f4d-4f0b-b2f8-0576f18cfc95',
  description: 'f994fd16-bfb0-4b72-ad97-734104efb1c0',
  templates: '56b8ebe3-14c8-4ff6-b073-741725a04162',
} as const;

export const DOCUMENT_TEMPLATE_FIELDS = {
  name: '050309a3-5437-429f-addd-804010aff4db',
  category: 'f3b5080e-aae2-4e4d-bdf2-d0487388814b',
  description: '5ff44796-77ae-4479-a2af-5c6b71f4e0fb',
  htmlSource: 'a45b67ab-a09e-42e4-b288-5cc34b9339a2',
  cssSource: 'eeb4c5ed-1637-4773-ad12-af628cfb43d7',
  previewData: '4f516d80-001b-4000-827c-a6c3811ac55f',
  variables: 'dffbba91-28f1-456d-9496-9d5df3021701',
  renderer: 'dc86ed49-c756-4166-9f8e-a117fdfdaf4d',
  boundObjectName: '3012ab43-b335-4e0a-b3e5-1739b6d08800',
  allowedOutputTypes: '59771ff1-ebb9-4b2f-8093-c2476a08fa0d',
  status: '0d115bc2-2d5e-4e82-b933-62732dcba599',
  version: 'd75a5707-d025-470f-88d4-cabd102781e0',
  versions: '77e05f84-ff18-45e8-b9d9-fd6a4d6aa74c',
  documents: '18a6f32c-d6ab-4c95-a5ab-a35670a2c574',
} as const;

export const TEMPLATE_VERSION_FIELDS = {
  name: '4e68836c-ed2d-4c48-a83a-81ef421ee0a3',
  template: 'e6e55c2e-f7f8-4f33-8d0d-6beefb014e9c',
  versionNumber: '0500aaf7-efb7-4c4f-b7ff-8e3e5dd38d81',
  htmlSource: '4aed6acb-7e9f-45fa-b8b1-9509a4dc79c4',
  cssSource: '4a746fc6-10c8-4ec4-b7b9-3979da39140c',
  diff: 'aa0373bf-33c8-429b-acba-e87028696850',
  createdBy: '445d1e51-e925-4862-9089-c0f5a368535e',
} as const;

export const DOCUMENT_FIELDS = {
  name: '85c2a7ea-7300-4a6a-80fd-6f57dca8914b',
  template: 'ab859ed3-e237-42d8-942b-0d34e5bba737',
  primaryObjectType: '84220294-eb6e-4e9b-bc00-fb055908372b',
  primaryRecordId: 'b75252e0-1993-4905-951d-3400e4a5fe6a',
  renderedHtml: 'd4c14004-d87b-4feb-860f-e0c37ad703c6',
  pdfUrl: '9f8ea9f3-3fdd-4aa9-b849-c61dfa5a8e14',  status: 'b92b494e-d314-4395-b699-c7535f290db6',
  errorMessage: '50e010d9-ac5c-488e-b04c-c6b9b886b89e',
  generatedBy: 'b7f7ad9f-085e-47fc-b7ba-ef0649ff17f3',
  generatedAt: '5697941d-e7a3-4a83-8e33-824e90bd21af',
  metadata: 'b4184cf7-a852-4735-ab8f-f7ea6e651394',
} as const;

export const DOCUMENT_TEMPLATE_VIEW_UNIVERSAL_IDENTIFIER = '86b7d128-f3f4-4761-8b04-83adc835659a';
export const DOCUMENT_VIEW_UNIVERSAL_IDENTIFIER = '5086fb8e-ac58-4f97-84da-c2cc08970bc0';
export const DOCUMENTS_TEMPLATES_NAVIGATION_FOLDER_UNIVERSAL_IDENTIFIER = '6a7ab786-6ab7-4443-8379-6b9bac687ae4';
export const DOCUMENTS_NAVIGATION_UNIVERSAL_IDENTIFIER = '411a0e2b-ee1d-4fa2-8292-a88eaac39af2';
export const DOCUMENTS_TEMPLATES_NAVIGATION_UNIVERSAL_IDENTIFIER = '588cfc4f-41bc-41df-a199-40a998ec5b71';
export const DOCUMENT_SHELL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER = '56f46af8-ff3b-4a70-875a-a0e8ac78a697';
export const OPEN_TEMPLATE_MANAGEMENT_COMMAND_UNIVERSAL_IDENTIFIER = '36f54902-a0e4-4db3-8a90-f32343c86849';
export const GENERATE_DOCUMENT_COMMAND_UNIVERSAL_IDENTIFIER = 'd141afd3-e12e-4c33-9ffe-ca36e366b3bb';

export const DOCUMENTS_TAB_UNIVERSAL_IDENTIFIERS = {
  company: '2b248e42-d90b-4aa1-ad0e-e23a2361811e',
  person: '596b907d-db12-437e-a76c-6e4a598a34ab',
  opportunity: '0951a49e-d410-44d8-8b8b-3c450c665d48',
} as const;

export const DOCUMENTS_TAB_WIDGET_UNIVERSAL_IDENTIFIERS = {
  company: 'f1563bac-ce95-40dc-9239-5f9a6c3f033c',
  person: '9dc0b870-8baf-46ab-9bd8-099183f06901',
  opportunity: '45436271-3b58-449f-8f7b-0fb4ca866401',
} as const;

// Twenty's built-in Attachment object's `file` field (FILES type), confirmed
// live via the Metadata API against a real workspace. Not app-owned — this is
// a system field universal identifier, stable across every Twenty workspace,
// required by `MetadataApiClient.uploadFile(...)` to upload bytes destined
// for an Attachment (see core-client-adapters.ts's storage adapter).
export const TWENTY_ATTACHMENT_FILE_FIELD_UNIVERSAL_IDENTIFIER = '20202020-15db-460e-8166-c7b5d87ad4be';

export const RENDER_TEMPLATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER = '1fcdb464-9f52-4904-81e4-bdadf3652237';
export const GENERATE_PDF_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER = '97e4bf7b-b731-45e1-9f0c-098d2cdbfc63';
export const SAVE_DOCUMENT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER = '9c896b3e-cf3b-4007-b2d9-2c1cdfc0505e';

export const TEMPLATE_EDITOR_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER = '77a547b5-20b6-474f-9029-6662fa0fb371';
export const GENERATE_DOCUMENT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER = '081e8445-bf9b-4c81-a20e-5d72c3290cad';

export const DOCUMENT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER = '1dd196b8-de1d-4cc7-8be0-a1e365ad6c81';
export const DOCUMENT_TEMPLATE_PAGE_LAYOUT_EDITOR_TAB_UNIVERSAL_IDENTIFIER = '54b1de8e-28ff-4eac-af93-3a3f88b999ef';
export const DOCUMENT_TEMPLATE_PAGE_LAYOUT_EDITOR_WIDGET_UNIVERSAL_IDENTIFIER = '8633de86-2484-4bdf-823b-adc0e4b35d30';
export const DOCUMENT_TEMPLATE_PAGE_LAYOUT_FIELDS_TAB_UNIVERSAL_IDENTIFIER = '55ae5ffb-8c69-473c-9eb9-55c3b6d3cfe3';
export const DOCUMENT_TEMPLATE_PAGE_LAYOUT_FIELDS_WIDGET_UNIVERSAL_IDENTIFIER = 'cd671d7d-f73d-4f47-9194-6bfc3d3a8007';

