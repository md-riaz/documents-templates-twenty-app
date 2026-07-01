import type { QueryGenqlSelection, Query, MutationGenqlSelection, Mutation, SubscriptionGenqlSelection, Subscription } from './schema';
import { type FieldsSelection, type GraphqlOperation, type ClientOptions, GenqlError } from './runtime';
export type { FieldsSelection } from './runtime';
export { GenqlError };
export * from './schema';
export interface Client {
    query<R extends QueryGenqlSelection>(request: R & {
        __name?: string;
    }): Promise<FieldsSelection<Query, R>>;
    mutation<R extends MutationGenqlSelection>(request: R & {
        __name?: string;
    }): Promise<FieldsSelection<Mutation, R>>;
}
export declare const createClient: (options?: ClientOptions | undefined) => Client;
export declare const everything: {
    __scalar: boolean;
};
export type QueryResult<fields extends QueryGenqlSelection> = FieldsSelection<Query, fields>;
export declare const generateQueryOp: (fields: QueryGenqlSelection & {
    __name?: string;
}) => GraphqlOperation;
export type MutationResult<fields extends MutationGenqlSelection> = FieldsSelection<Mutation, fields>;
export declare const generateMutationOp: (fields: MutationGenqlSelection & {
    __name?: string;
}) => GraphqlOperation;
export type SubscriptionResult<fields extends SubscriptionGenqlSelection> = FieldsSelection<Subscription, fields>;
export declare const generateSubscriptionOp: (fields: SubscriptionGenqlSelection & {
    __name?: string;
}) => GraphqlOperation;
type MetadataApiClientOptions = ClientOptions;
export declare class MetadataApiClient {
    private client;
    private url;
    private requestOptions;
    private headers;
    private fetchImplementation;
    private authorizationToken;
    private refreshAccessTokenPromise;
    constructor(options?: MetadataApiClientOptions);
    query<R extends QueryGenqlSelection>(request: R & {
        __name?: string;
    }): Promise<FieldsSelection<Query, R>>;
    mutation<R extends MutationGenqlSelection>(request: R & {
        __name?: string;
    }): Promise<FieldsSelection<Mutation, R>>;
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
