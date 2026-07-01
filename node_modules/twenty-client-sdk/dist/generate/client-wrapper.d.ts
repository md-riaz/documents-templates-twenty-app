type ClientWrapperOptions = {
    apiClientName: string;
    defaultUrl: string;
    includeUploadFile: boolean;
};
export declare const buildClientWrapperSource: (templateSource: string, options: ClientWrapperOptions) => string;
export {};
