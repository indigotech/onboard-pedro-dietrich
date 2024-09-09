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
    afterEach(async function () {
      await prisma.user.deleteMany({});
    });

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

    it('should store user in the database and return it to client', async function () {
      const response = await axios.post(url, createUserMutation);
      const createdUser: User = response.data.data.createUser;
      const databaseUserInfo = await prisma.user.findUnique({ where: { email: userInput.email } });

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
  });
});
