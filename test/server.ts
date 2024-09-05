import axios from 'axios';
import { expect } from 'chai';
import { ApolloServer } from '@apollo/server';

import { startDatabase, startServer, prisma } from '../src/server.js';

describe('Onboard server', function () {
  let server: ApolloServer;
  let url: string;

  before(async function () {
    startDatabase();
    ({ server, url } = await startServer(parseInt(process.env.SERVER_PORT)));
  });

  after(async function () {
    await server.stop();
  });

  afterEach(async function () {
    await prisma.user.deleteMany({});
  });

  describe('Database connection', function () {
    it('should be connected to the database through Prisma', async function () {
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@user.com',
          password: 'test_password',
          birthDate: new Date('2000-01-01'),
        },
      });

      expect(user).not.to.be.eq(null);
    });
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
});
