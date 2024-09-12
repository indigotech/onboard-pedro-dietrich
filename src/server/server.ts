import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { serverContext } from './server-context.js';
import { formatError } from './server-error.js';
import { resolvers } from '../resolvers.js';
import { typeDefs } from '../typedefs.js';

export let url: string;

export const startServer = async (port: number): Promise<{ server: ApolloServer }> => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError,
  });

  ({ url } = await startStandaloneServer(server, {
    listen: { port: port },
    context: serverContext,
  }));

  return { server: server };
};
