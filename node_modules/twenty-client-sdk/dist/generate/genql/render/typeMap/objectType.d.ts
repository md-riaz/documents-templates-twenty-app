import { GraphQLInterfaceType, GraphQLObjectType, GraphQLInputObjectType } from 'graphql';
import { RenderContext } from '../common/RenderContext';
import { FieldMap } from '../../runtime/types';
export declare const objectType: (type: GraphQLInputObjectType | GraphQLInterfaceType | GraphQLObjectType<any, any>, ctx: RenderContext) => FieldMap<string>;
