import axios from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import { ApolloServer } from '@apollo/server';

import { initializeDatabaseInstance, startServer, prisma, DatabaseUserData } from '../src/server.js';
import { User, UserInput } from '../src/typedefs.js';

describe('Onboard server API', function () {
  let server: ApolloServer;
  let url: string;

  before(async function () {
    initializeDatabaseInstance();
    ({ server, url } = await startServer(+process.env.SERVER_PORT));
    axios.defaults.headers.authorization = jwt.sign({ userId: 1 }, process.env.TOKEN_KEY, { expiresIn: '30m' });
  });

  after(async function () {
    await server.stop();
  });

  describe('#Hello query', function () {
    it('should fetch the response "Hello World!"', async function () {
      const response = await axios.post(url, {
        query: `#graphql
          query Hello {
            hello
          }
        `,
      });

      expect(response.data.data.hello).to.be.eq('Hello World!');
    });
  });

  describe('#Create user mutation', async function () {
    let userInput: UserInput = {
      name: 'Test User',
      email: 'test@user.com',
      password: 'password123',
      birthDate: '2000-01-01',
    };

    beforeEach(function () {
      userInput = {
        name: 'Test User',
        email: 'test@user.com',
        password: 'password123',
        birthDate: '2000-01-01',
      };

      axios.defaults.headers.authorization = jwt.sign({ userId: 1 }, process.env.TOKEN_KEY, { expiresIn: '30m' });
    });

    afterEach(async function () {
      await prisma.user.deleteMany({});
    });

    const createUserQuery = `#graphql
      mutation CreateUserMutation($user: UserInput!) {
        createUser(user: $user) {
          id
          name
          email
          birthDate
        }
      }
    `;

    const createUserMutation = {
      operationName: 'CreateUserMutation',
      query: createUserQuery,
      variables: { user: userInput },
    };

    it('should store user in the database and return it to client', async function () {
      const response = await axios.post(url, createUserMutation);
      const createdUser: User = response.data.data.createUser;
      const databaseUserInfo: DatabaseUserData = await prisma.user.findUnique({ where: { email: userInput.email } });

      expect(databaseUserInfo.name).to.be.eq(userInput.name);
      expect(databaseUserInfo.email).to.be.eq(userInput.email);
      expect(databaseUserInfo.birthDate).to.be.deep.eq(new Date(userInput.birthDate));
      expect(bcrypt.compareSync(userInput.password, databaseUserInfo.password)).to.be.eq(true);

      expect(createdUser).to.be.deep.eq({
        id: databaseUserInfo.id.toString(),
        name: userInput.name,
        email: userInput.email,
        birthDate: new Date(userInput.birthDate).getTime().toString(),
      });
    });

    it('should fail to create user without valid JWT', async function () {
      axios.defaults.headers.authorization = '';

      const previousUserCount = await prisma.user.count();
      const response = await axios.post(url, createUserMutation);
      const currentUserCount = await prisma.user.count();

      expect(currentUserCount).to.be.eq(previousUserCount);
      expect(response.data).to.be.deep.eq({
        errors: [
          {
            message: 'Authentication token missing.',
            extensions: {
              code: 'UNAUTHENTICATED',
            },
          },
        ],
      });
    });

    it('should fail to create user with repeated e-mail', async function () {
      await prisma.user.create({
        data: {
          name: userInput.name,
          email: userInput.email,
          password: userInput.password,
          birthDate: new Date(userInput.birthDate),
        },
      });
      const response = await axios.post(url, createUserMutation);
      const userCount = await prisma.user.count();

      expect(userCount).to.be.eq(1);
      expect(response.data).to.be.deep.eq({
        data: {
          createUser: null,
        },
        errors: [
          {
            message: 'E-mail is already in use.',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              additionalInfo: 'The e-mail must be unique, and the one received is already present in the database.',
            },
            locations: [{ column: 9, line: 3 }],
            path: ['createUser'],
          },
        ],
      });
    });

    it('should fail to create user with weak password', async function () {
      userInput.password = 'weak_password';
      const weakCreateUserMutation = {
        operationName: 'CreateUserMutation',
        query: createUserQuery,
        variables: { user: userInput },
      };

      const response = await axios.post(url, weakCreateUserMutation);
      const userCount = await prisma.user.count();

      expect(userCount).to.be.eq(0);
      expect(response.data).to.be.deep.eq({
        data: {
          createUser: null,
        },
        errors: [
          {
            message: 'Invalid password.',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              additionalInfo: 'Password needs to contain at least 6 characters, with at least 1 letter and 1 digit.',
            },
            locations: [{ column: 9, line: 3 }],
            path: ['createUser'],
          },
        ],
      });
    });

    it('should fail to create user with invalid birth date', async function () {
      userInput.birthDate = '2100-12-31';
      const invalidBdayCreateUserMutation = {
        operationName: 'CreateUserMutation',
        query: createUserQuery,
        variables: { user: userInput },
      };

      const response = await axios.post(url, invalidBdayCreateUserMutation);
      const userCount = await prisma.user.count();

      expect(userCount).to.be.eq(0);
      expect(response.data).to.be.deep.eq({
        data: {
          createUser: null,
        },
        errors: [
          {
            message: 'Unreasonable birth date detected.',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              additionalInfo: 'The birth date must be between the year 1900 and the current date.',
            },
            locations: [{ column: 9, line: 3 }],
            path: ['createUser'],
          },
        ],
      });
    });
  });
});
