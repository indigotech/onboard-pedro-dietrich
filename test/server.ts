import axios from 'axios';
import { expect } from 'chai';
import { ApolloServer } from '@apollo/server';

import { startServer } from '../src/server.js';

describe('Hello API', function () {
  let server: ApolloServer;
  let url: string;

  before(async function () {
    ({ server, url } = await startServer(4001));
  });

  after(async function () {
    await server.stop();
  });

  describe('#hello', function () {
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
