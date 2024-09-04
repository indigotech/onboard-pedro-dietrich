import { ApolloServer } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const typeDefs = `#graphql
  type Query {
    hello: String!
  }

  input UserInput {
    name: String!
    email: String!
    password: String!
    birthDate: String!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    birthDate: String!
  }

  type Mutation {
    createUser(user: UserInput!): User
  }
`;

interface UserInput {
  name: string;
  email: string;
  password: string;
  birthDate: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  birthDate: Date;
}

async function insertUserIntoDB(userData: UserInput): Promise<User> {
  try {
    const newUser = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        birthDate: new Date(userData.birthDate),
      },
    });

    return newUser;
  } catch (err) {
    throw new GraphQLError('Failed to create new user.', {
      extensions: {
        code: 'INVALID_USER_DATA',
        errorInfo: err,
      },
    });
  }
}

const resolvers = {
  Query: {
    hello: () => 'Hello World!',
  },
  Mutation: {
    createUser: async (_, args: { user: UserInput }): Promise<User> => {
      const user = await insertUserIntoDB(args.user);

      return user;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`Server ready at: ${url}`);
