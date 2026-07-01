import { GraphQLSchema } from 'graphql';
import { type Config } from '../config';
export declare const writeClientFiles: (config: Config, schema: GraphQLSchema) => Promise<void>;
