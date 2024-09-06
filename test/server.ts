import axios from 'axios';
import bcrypt from 'bcryptjs';
import { expect } from 'chai';
import { ApolloServer } from '@apollo/server';

import { initializeDatabaseInstance, startServer, prisma, User, UserInput } from '../src/server.js';

describe('Onboard server API', function () {
  let server: ApolloServer;
  let url: string;

  before(async function () {
    initializeDatabaseInstance();
    ({ server, url } = await startServer(parseInt(process.env.SERVER_PORT)));
  });

  after(async function () {
    await server.stop();
  });

  afterEach(async function () {
    await prisma.user.deleteMany({});
  });

  describe('Hello query', function () {
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

  describe('Create user mutation', async function () {
    const userInput: UserInput = {
      name: 'Test User',
      email: 'test@user.com',
      password: 'password123',
      birthDate: '2000-01-01',
    };

    const createUserMutation = {
      operationName: 'CreateUserMutation',
      query: `#graphql
        mutation CreateUserMutation($user: UserInput!) {
          createUser(user: $user) {
            id
            name
            email
            birthDate
          }
        }
      `,
      variables: {
        user: userInput,
      },
    };

    let createdUser: User;
    let databaseUserInfo: {
      id: number;
      name: string;
      email: string;
      password: string;
      birthDate: Date;
    };

    before(async function () {
      const response = await axios.post(url, createUserMutation);
      createdUser = response.data.data.createUser;
      databaseUserInfo = await prisma.user.findUnique({ where: { email: userInput.email } });
    });

    it('user ID in response should match user ID in the database', function () {
      expect(createdUser.id).to.be.eq(databaseUserInfo.id.toString());
    });
    it('user name in response should match user name in request', function () {
      expect(createdUser.name).to.be.eq(userInput.name);
    });
    it('user e-mail in response should match user e-mail in request', function () {
      expect(createdUser.email).to.be.eq(userInput.email);
    });
    it('user birth date in response should match user birth date in the request', function () {
      expect(createdUser.birthDate).to.be.eq(new Date(userInput.birthDate).getTime().toString());
    });
    it('user password in request, after encryption, should match user password in the database', function () {
      expect(bcrypt.compareSync(userInput.password, databaseUserInfo.password)).to.be.equal(true);
    });
  });
});
