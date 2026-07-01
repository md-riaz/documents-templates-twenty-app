export declare const GENERATED_CORE_DIR = "core/generated";
export declare const generateCoreClientFromSchema: ({ schema, outputPath, clientWrapperTemplateSource, }: {
    schema: string;
    outputPath: string;
    clientWrapperTemplateSource?: string | undefined;
}) => Promise<void>;
export declare const replaceCoreClient: ({ packageRoot, schema, }: {
    packageRoot: string;
    schema: string;
}) => Promise<void>;
