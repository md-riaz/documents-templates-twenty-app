import { GraphQLSchema } from 'graphql';
import { type Config } from '../config';
export declare const loadConfiguredSchema: (config: Config) => Promise<GraphQLSchema>;
