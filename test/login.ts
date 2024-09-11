import axios from 'axios';
import bcrypt from 'bcryptjs';
import { expect } from 'chai';

import { initializeDatabaseInstance, prisma, startServer, DatabaseUserData } from '../src/server.js';
import { ApolloServer } from '@apollo/server';
import { LoginInput, UserInput, User } from '../src/typedefs.js';

describe('Login API', function () {
  let server: ApolloServer;
  let url: string;

  before(async function () {
    initializeDatabaseInstance();
    ({ server, url } = await startServer(+process.env.SERVER_PORT));
  });

  after(async function () {
    await server.stop();
  });

  describe('#Login mutation', async function () {
    const userInput: UserInput = {
      name: 'Test User',
      email: 'test@user.com',
      password: 'password123',
      birthDate: '2000-01-01',
    };

    let loginInput: LoginInput = {
      email: 'test@user.com',
      password: 'password123',
    };

    const loginQuery = `#graphql
      mutation LoginMutation($loginInput: LoginInput!) {
        login(loginInput: $loginInput) {
          user {
            id
            name
            email
            birthDate
          },
          token,
        }
      }
    `;

    const loginMutation = {
      operationName: 'LoginMutation',
      query: loginQuery,
      variables: { loginInput: loginInput },
    };

    let dbUser: DatabaseUserData;

    beforeEach(async function () {
      loginInput = {
        email: 'test@user.com',
        password: 'password123',
      };

      dbUser = await prisma.user.create({
        data: {
          name: userInput.name,
          email: userInput.email,
          password: await bcrypt.hash(userInput.password, 10),
          birthDate: new Date(userInput.birthDate),
        },
      });
    });

    afterEach(async function () {
      await prisma.user.deleteMany({});
    });

    it('should be able to login with the correct credentials', async function () {
      const response = await axios.post(url, loginMutation);
      const user: User = response.data.data.login.user;
      const token: string = response.data.data.login.token;

      expect(user).to.be.deep.eq({
        id: dbUser.id.toString(),
        name: dbUser.name,
        email: loginInput.email,
        birthDate: dbUser.birthDate.getTime().toString(),
      });
      expect(!token).to.be.eq(false);
    });

    it('should not be able to login with incorrect password', async function () {
      loginInput.password = 'incorrect_password123';
      const incorrectLoginMutation = {
        operationName: 'LoginMutation',
        query: loginQuery,
        variables: { loginInput: loginInput },
      };

      const response = await axios.post(url, incorrectLoginMutation);
      const loginData = response.data;

      expect(loginData).to.be.deep.eq({
        data: {
          login: null,
        },
        errors: [
          {
            message: 'Incorrect e-mail or password.',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              additionalInfo: 'The credentials are incorrect. Try again.',
            },
            path: ['login'],
            locations: [{ column: 9, line: 3 }],
          },
        ],
      });
    });

    it('should not be able to login with incorrect e-mail', async function () {
      loginInput.email = 'wrong@user.com';
      const incorrectLoginMutation = {
        operationName: 'LoginMutation',
        query: loginQuery,
        variables: { loginInput: loginInput },
      };

      const response = await axios.post(url, incorrectLoginMutation);
      const loginData = response.data;

      expect(loginData).to.be.deep.eq({
        data: {
          login: null,
        },
        errors: [
          {
            message: 'Incorrect e-mail or password.',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              additionalInfo: 'The credentials are incorrect. Try again.',
            },
            path: ['login'],
            locations: [{ column: 9, line: 3 }],
          },
        ],
      });
    });
  });
});