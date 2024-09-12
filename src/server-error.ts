import { GraphQLError } from 'graphql';
import { unwrapResolverError } from '@apollo/server/errors';

export class ServerErrorGQL extends GraphQLError {
  public constructor(
    public code: number,
    message: string,
    public additionalInfo?: string,
  ) {
    super(message);
  }
}

export interface ServerErrorInterface {
  code: number;
  message: string;
  additionalInfo?: string;
}

export const formatError = function (formattedError: GraphQLError, error: unknown): ServerErrorInterface {
  const err = unwrapResolverError(error) as Error;

  if (err instanceof ServerErrorGQL) {
    return {
      code: err.code,
      message: err.message,
      additionalInfo: err.additionalInfo,
    };
  }

  return {
    code: 500,
    message: 'Internal server error.',
    additionalInfo: 'An unhandled error has ocurred in the server.',
  };
};
