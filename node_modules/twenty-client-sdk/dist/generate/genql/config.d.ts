export declare const RUNTIME_LIB_NAME = "./runtime";
export interface Config {
    schema?: string;
    output?: string;
    scalarTypes?: {
        [k: string]: string;
    };
    sortProperties?: boolean;
}
