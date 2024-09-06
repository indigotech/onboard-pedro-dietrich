import bcrypt from 'bcryptjs';
import { ApolloServer } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { PrismaClient } from '@prisma/client';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export let prisma: PrismaClient;

export const initializeDatabaseInstance = (): void => {
  prisma = new PrismaClient();
};

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

export interface UserInput {
  name: string;
  email: string;
  password: string;
  birthDate: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  birthDate: Date;
}

class ServerErrorGQL extends GraphQLError {
  public code: number;

  public constructor(code: number, message: string, additionalInfo: string) {
    super(message, { extensions: { additionalInfo: additionalInfo } });
    this.code = code;
  }
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
    throw new ServerErrorGQL(
      400,
      'Invalid password',
      'Password needs to contain at least 6 characters, with at least 1 letter and 1 digit.',
    );
  }
  if (!validateBirthDate(userData.birthDate)) {
    throw new ServerErrorGQL(
      400,
      'Unreasonable birth date detected.',
      'The birth date must be between the year 1900 and the current date.',
    );
  }

  try {
    return await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: await hashPassword(userData.password),
        birthDate: new Date(userData.birthDate),
      },
    });
  } catch (err) {
    let message = 'User could not be created.';
    let additionalInfo = 'The user could not be inserted in the database due to an unhandled error.';

    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
      message = 'E-mail is already in use.';
      additionalInfo = 'The e-mail must be unique, and the one received is already present in the database.';
    }

    throw new ServerErrorGQL(400, message, additionalInfo);
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

export const startServer = async (port: number): Promise<{ server: ApolloServer; url: string }> => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: port },
  });

  return { server: server, url: url };
};
