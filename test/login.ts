import axios from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import { ApolloServer } from '@apollo/server';

import { TokenInterface } from '../src/server-context.js';
import { LoginInput, UserInput, User } from '../src/typedefs.js';
import { initializeDatabaseInstance, prisma, startServer, DatabaseUserData } from '../src/server.js';

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
      const tokenData = jwt.verify(token, process.env.TOKEN_KEY) as TokenInterface;
      const tokenDuration = tokenData.exp - tokenData.iat;

      expect(user).to.be.deep.eq({
        id: dbUser.id.toString(),
        name: dbUser.name,
        email: loginInput.email,
        birthDate: dbUser.birthDate.getTime().toString(),
      });
      expect(tokenData.userId).to.be.eq(dbUser.id);
      expect(tokenDuration).to.be.eq(30 * 60);
    });

    it('should be able to login with the correct credentials and using "Remember Me"', async function () {
      loginInput.rememberMe = true;
      const rememberMeLoginMutation = {
        operationName: 'LoginMutation',
        query: loginQuery,
        variables: { loginInput: loginInput },
      };

      const response = await axios.post(url, rememberMeLoginMutation);
      const user: User = response.data.data.login.user;

      const token: string = response.data.data.login.token;
      const tokenData = jwt.verify(token, process.env.TOKEN_KEY) as TokenInterface;
      const tokenDuration = tokenData.exp - tokenData.iat;

      expect(user).to.be.deep.eq({
        id: dbUser.id.toString(),
        name: dbUser.name,
        email: loginInput.email,
        birthDate: dbUser.birthDate.getTime().toString(),
      });
      expect(tokenData.userId).to.be.eq(dbUser.id);
      expect(tokenDuration).to.be.eq(7 * 24 * 60 * 60);
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
            code: 400,
            message: 'Incorrect e-mail or password.',
            additionalInfo: 'The credentials are incorrect. Try again.',
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
            code: 400,
            message: 'Incorrect e-mail or password.',
            additionalInfo: 'The credentials are incorrect. Try again.',
          },
        ],
      });
    });
  });
});
