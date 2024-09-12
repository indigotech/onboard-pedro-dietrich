import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { serverContext } from './server-context.js';
import { formatError } from './server-error.js';
import { resolvers } from '../resolvers.js';
import { typeDefs } from '../typedefs.js';

export const startServer = async (port: number): Promise<{ server: ApolloServer; url: string }> => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: port },
    context: serverContext,
  });

  return { server: server, url: url };
};
