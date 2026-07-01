type QueryGenqlSelection = Record<string, unknown>;
type MutationGenqlSelection = Record<string, unknown>;
type GraphqlOperation = Record<string, unknown>;
type ClientOptions = {
    url?: string;
    headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
    fetcher?: (operation: GraphqlOperation | GraphqlOperation[]) => Promise<unknown>;
    fetch?: typeof globalThis.fetch;
    batch?: unknown;
};
type TwentyGeneratedClientOptions = ClientOptions;
export declare class TwentyGeneratedClient {
    private client;
    private url;
    private requestOptions;
    private headers;
    private fetchImplementation;
    private authorizationToken;
    private refreshAccessTokenPromise;
    constructor(options?: TwentyGeneratedClientOptions);
    query<R extends QueryGenqlSelection>(request: R & {
        __name?: string;
    }): Promise<unknown>;
    mutation<R extends MutationGenqlSelection>(request: R & {
        __name?: string;
    }): Promise<unknown>;
    uploadFile(fileBuffer: Buffer, filename: string, contentType: string | undefined, fieldMetadataUniversalIdentifier: string): Promise<{
        id: string;
        path: string;
        size: number;
        createdAt: string;
        url: string;
    }>;
    private executeGraphqlRequestWithOptionalRefresh;
    private executeGraphqlRequest;
    private resolveHeaders;
    private shouldRefreshToken;
    private assertResponseIsSuccessful;
    private requestRefreshedAccessToken;
    private setAuthorizationToken;
}
export {};
