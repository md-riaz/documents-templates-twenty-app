import { GraphQLEnumType, GraphQLScalarType } from 'graphql';
import { RenderContext } from '../common/RenderContext';
import { Type } from '../../runtime/types';
export declare const scalarType: (type: GraphQLEnumType | GraphQLScalarType<unknown, unknown>, _: RenderContext) => Type<string>;
