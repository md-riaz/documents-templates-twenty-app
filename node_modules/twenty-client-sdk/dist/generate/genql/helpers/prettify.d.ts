import { BuiltInParserName } from 'prettier';
export declare const prettify: (code: string, parser?: BuiltInParserName | undefined) => Promise<string>;
