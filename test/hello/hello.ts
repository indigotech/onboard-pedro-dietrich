import axios from 'axios';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { url } from '../../src/server/server.js';

describe('Hello API', function () {
  describe('#Hello query', function () {
    beforeEach(function () {
      axios.defaults.headers.authorization = jwt.sign({ userId: 1 }, process.env.TOKEN_KEY, { expiresIn: '30m' });
    });

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
