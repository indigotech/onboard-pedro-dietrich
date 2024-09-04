import { ApolloServer } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

function validatePassword(password: string): boolean {
  const passwordValidationRegex = new RegExp('^(?=.*?[A-Za-z])(?=.*?\\d).{6,}$');
  return passwordValidationRegex.test(password);
}

function validateBirthDate(birthDate: string): boolean {
  const birthDateTime = new Date(birthDate).getTime();
  const fromDate = new Date('1900-01-01').getTime();
  const today = new Date().getTime();

  return birthDateTime > fromDate && birthDateTime < today;
}

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

async function insertUserIntoDB(userData: UserInput): Promise<User> {
  if (!validatePassword(userData.password)) {
    throw new GraphQLError('Password needs to contain at least 6 characters, with at least 1 letter and 1 digit.', {
      extensions: {
        code: 'INVALID_PASSWORD',
      },
    });
  }
  if (!validateBirthDate(userData.birthDate)) {
    throw new GraphQLError('Unreasonable birth date detected.', {
      extensions: {
        code: 'INVALID_BIRTH_DATE',
      },
    });
  }

  try {
    const newUser = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: await hashPassword(userData.password),
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
      return insertUserIntoDB(args.user);
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
