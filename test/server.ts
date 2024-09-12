import axios from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import { ApolloServer } from '@apollo/server';

import { initializeDatabaseInstance, startServer, prisma, DatabaseUserData } from '../src/server.js';
import { User, UserInput } from '../src/typedefs.js';

describe('User API', function () {
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
        data: {
          createUser: null,
        },
        errors: [
          {
            message: 'Unauthenticated user.',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              additionalInfo: 'The JWT is either missing or invalid.',
            },
            locations: [{ column: 9, line: 3 }],
            path: ['createUser'],
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

  describe('#User query', async function () {
    const userData: UserInput = {
      name: 'Test User',
      email: 'test@user.com',
      password: 'password123',
      birthDate: '2000-01-01',
    };

    beforeEach(function () {
      axios.defaults.headers.authorization = jwt.sign({ userId: 1 }, process.env.TOKEN_KEY, { expiresIn: '30m' });
    });

    afterEach(async function () {
      await prisma.user.deleteMany({});
    });

    const getUserQuery = `#graphql
      query GetUserQuery($userId: GetUserInput!) {
        user(userId: $userId) {
          id
          name
          email
          birthDate
        }
      }
    `;

    it('should fetch the correct user by the ID', async function () {
      const dbUser = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          birthDate: new Date(userData.birthDate),
        },
      });

      const userQuery = {
        operationName: 'GetUserQuery',
        query: getUserQuery,
        variables: { userId: { id: dbUser.id } },
      };

      const response = await axios.post(url, userQuery);
      const foundUser: User = response.data.data.user;

      expect(foundUser).to.be.deep.eq({
        id: dbUser.id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        birthDate: new Date(dbUser.birthDate).getTime().toString(),
      });
    });

    it('should fail to find user with inexistent ID', async function () {
      const userQuery = {
        operationName: 'GetUserQuery',
        query: getUserQuery,
        variables: { userId: { id: 123456789 } },
      };

      const response = await axios.post(url, userQuery);

      expect(response.data).to.be.deep.eq({
        data: {
          user: null,
        },
        errors: [
          {
            message: 'User does not exist.',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              additionalInfo: 'No user with the specified ID could be found.',
            },
            locations: [{ column: 9, line: 3 }],
            path: ['user'],
          },
        ],
      });
    });

    it('should fail to fetch user when unauthenticated', async function () {
      axios.defaults.headers.authorization = '';
      const dbUser = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          birthDate: new Date(userData.birthDate),
        },
      });

      const userQuery = {
        operationName: 'GetUserQuery',
        query: getUserQuery,
        variables: { userId: { id: dbUser.id } },
      };

      const response = await axios.post(url, userQuery);

      expect(response.data).to.be.deep.eq({
        data: {
          user: null,
        },
        errors: [
          {
            message: 'Unauthenticated user.',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              additionalInfo: 'The JWT is either missing or invalid.',
            },
            locations: [{ column: 9, line: 3 }],
            path: ['user'],
          },
        ],
      });
    });
  });

  describe('#Users query', async function () {
    let dbUsers: DatabaseUserData[];

    beforeEach(async function () {
      const usersInput = [];
      for (let i = 1; i <= 50; i++) {
        usersInput.push({
          name: 'User ' + i.toString(),
          email: 'user' + i.toString() + '@test.com',
          password: 'password123',
          birthDate: new Date('2001-02-03'),
        });
      }

      dbUsers = await prisma.user.createManyAndReturn({ data: usersInput });
      dbUsers.sort(function (userA, userB) {
        if (userA.name < userB.name) {
          return -1;
        }
        if (userA.name > userB.name) {
          return 1;
        }
        return 0;
      });

      axios.defaults.headers.authorization = jwt.sign({ userId: 1 }, process.env.TOKEN_KEY, { expiresIn: '30m' });
    });

    afterEach(async function () {
      await prisma.user.deleteMany({});
    });

    const getUserListQuery = `#graphql
      query GetUserListQuery($usersInput: UserListInput) {
        users(usersInput: $usersInput) {
          users {
            id
            name
            email
            birthDate
          }
          totalUsers
          offset
          lastPage
        }
      }
    `;

    it('should retrieve an user list with default values', async function () {
      const usersQuery = {
        operationName: 'GetUserListQuery',
        query: getUserListQuery,
        variables: null,
      };

      const expectedList = dbUsers
        .map(({ id, name, email, birthDate }) => ({
          id: id.toString(),
          name,
          email,
          birthDate: new Date(birthDate).getTime().toString(),
        }))
        .slice(0, 10);

      const response = await axios.post(url, usersQuery);

      expect(response.data.data).to.be.deep.eq({
        users: {
          users: expectedList,
          totalUsers: dbUsers.length,
          offset: 0,
          lastPage: false,
        },
      });
    });

    it('should retrieve an user list with specified values', async function () {
      const amount = 20;
      const offset = 40;

      const usersQuery = {
        operationName: 'GetUserListQuery',
        query: getUserListQuery,
        variables: { usersInput: { userLimit: amount, offset: offset } },
      };

      const expectedList = dbUsers
        .map(({ id, name, email, birthDate }) => ({
          id: id.toString(),
          name,
          email,
          birthDate: new Date(birthDate).getTime().toString(),
        }))
        .slice(offset, offset + amount);

      const response = await axios.post(url, usersQuery);

      expect(response.data.data).to.be.deep.eq({
        users: {
          users: expectedList,
          totalUsers: dbUsers.length,
          offset: offset,
          lastPage: true,
        },
      });
    });

    it('should retrieve an empty user list when offset is greater than the total user count', async function () {
      const amount = 5;
      const offset = 70;

      const usersQuery = {
        operationName: 'GetUserListQuery',
        query: getUserListQuery,
        variables: { usersInput: { userLimit: amount, offset: offset } },
      };

      const response = await axios.post(url, usersQuery);

      expect(response.data.data).to.be.deep.eq({
        users: {
          users: [],
          totalUsers: dbUsers.length,
          offset: offset,
          lastPage: false,
        },
      });
    });

    it('should fail to fetch user list when unauthenticated', async function () {
      axios.defaults.headers.authorization = '';

      const usersQuery = {
        operationName: 'GetUserListQuery',
        query: getUserListQuery,
        variables: null,
      };

      const response = await axios.post(url, usersQuery);

      expect(response.data).to.be.deep.eq({
        data: null,
        errors: [
          {
            message: 'Unauthenticated user.',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              additionalInfo: 'The JWT is either missing or invalid.',
            },
            locations: [{ column: 9, line: 3 }],
            path: ['users'],
          },
        ],
      });
    });
  });
});
