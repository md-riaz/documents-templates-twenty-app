import { GraphQLField, GraphQLInterfaceType, GraphQLObjectType } from 'graphql';
import { RenderContext } from '../common/RenderContext';
export declare const objectType: (type: GraphQLInterfaceType | GraphQLObjectType<any, any>, ctx: RenderContext) => void;
export declare const toArgsString: (field: GraphQLField<any, any, any>) => string;
