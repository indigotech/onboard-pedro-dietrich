import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import login from '../api/login/login.js';
import getUser from '../api/user/get-user.js';
import getUsers from '../api/user/get-users.js';
import createUser from '../api/user/create-user.js';
import { ServerErrorGQL, formatError } from './server-error.js';
import { serverContext, AuthenticationResult } from './server-context.js';
import {
  typeDefs,
  UserInput,
  GetUserInput,
  UserListInput,
  LoginInput,
  User,
  UserList,
  Authentication,
} from '../typedefs.js';

function verifyUserID(authResult: AuthenticationResult): void {
  if (!authResult.isAuthenticated || !authResult.userId) {
    throw new ServerErrorGQL(401, 'Unauthenticated user.', 'The JWT is either missing or invalid.');
  }
}

const resolvers = {
  Query: {
    hello: (_, __, context) => {
      verifyUserID(context.authResult);
      return 'Hello World!';
    },
    user: async (_, args: { userId: GetUserInput }, context): Promise<User> => {
      verifyUserID(context.authResult);
      return getUser(args.userId);
    },
    users: async (_, args: { usersInput: UserListInput }, context): Promise<UserList> => {
      verifyUserID(context.authResult);
      return getUsers(args.usersInput);
    },
  },
  Mutation: {
    createUser: async (_, args: { user: UserInput }, context): Promise<User> => {
      verifyUserID(context.authResult);
      return createUser(args.user);
    },
    login: async (_, args: { loginInput: LoginInput }): Promise<Authentication> => {
      return login(args.loginInput);
    },
  },
};

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
