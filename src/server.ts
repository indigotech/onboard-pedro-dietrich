import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { PrismaClient } from '@prisma/client';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { serverContext, AuthenticationResult } from './server-context.js';
import { typeDefs, GetUserInput, User, UserInput, LoginInput, Authentication } from './typedefs.js';

export interface DatabaseUserData {
  id: number;
  name: string;
  email: string;
  password: string;
  birthDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export let prisma: PrismaClient;

export const initializeDatabaseInstance = (): void => {
  prisma = new PrismaClient();
};

class ServerErrorGQL extends GraphQLError {
  public code: number;

  public constructor(code: number, message: string, additionalInfo: string) {
    super(message, { extensions: { additionalInfo: additionalInfo } });
    this.code = code;
  }
}

async function getUser(userId: GetUserInput): Promise<User> {
  let user: User;
  try {
    user = await prisma.user.findUnique({ where: { id: +userId.id } });
  } catch (err) {
    console.log(err);
    throw new ServerErrorGQL(
      400,
      'Could not fetch user data.',
      'User could not be found due to an unhandled error has ocurred',
    );
  }

  if (user == null) {
    throw new ServerErrorGQL(400, 'User does not exist.', 'No user with the specified ID could be found.');
  }
  return user;
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
      'Invalid password.',
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

async function login(loginInput: LoginInput): Promise<Authentication> {
  let user: DatabaseUserData;
  try {
    user = await prisma.user.findUnique({ where: { email: loginInput.email } });
  } catch {
    throw new ServerErrorGQL(
      500,
      'Could not login into account.',
      'Login could not be done due to an unhandled error.',
    );
  }

  if (user && bcrypt.compareSync(loginInput.password, user.password)) {
    let expiresTime = '30m';
    if (loginInput?.rememberMe) {
      expiresTime = '7d';
    }
    return {
      user: user,
      token: jwt.sign({ userId: user.id }, process.env.TOKEN_KEY, { expiresIn: expiresTime }),
    };
  }
  throw new ServerErrorGQL(400, 'Incorrect e-mail or password.', 'The credentials are incorrect. Try again.');
}

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
  },
  Mutation: {
    createUser: async (_, args: { user: UserInput }, context): Promise<User> => {
      verifyUserID(context.authResult);
      return insertUserIntoDB(args.user);
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
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: port },
    context: serverContext,
  });

  return { server: server, url: url };
};
