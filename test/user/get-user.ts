import axios from 'axios';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { url } from '../../src/server/server.js';
import { User, UserInput } from '../../src/typedefs.js';
import { prisma, DatabaseUserData } from '../../src/database.js';

export default function () {
  describe('#User query', async function () {
    const userData: UserInput = {
      name: 'Test User',
      email: 'test@user.com',
      password: 'password123',
      birthDate: '2000-01-01',
      addresses: [
        {
          cep: 12345678,
          street: 'Test Street',
          streetNumber: 123,
          complement: 1,
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'Test State',
        },
      ],
    };

    beforeEach(function () {
      axios.defaults.headers.authorization = jwt.sign({ userId: 1 }, process.env.TOKEN_KEY, { expiresIn: '30m' });
    });

    afterEach(async function () {
      await prisma.address.deleteMany({});
      await prisma.user.deleteMany({});
    });

    const getUserQuery = `#graphql
    query GetUserQuery($userId: GetUserInput!) {
      user(userId: $userId) {
        id
        name
        email
        birthDate
        addresses {
          id
          cep
          street
          streetNumber
          complement
          neighborhood
          city
          state
        }
      }
    }
  `;

    it('should fetch the correct user by the ID', async function () {
      const dbUser: DatabaseUserData = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: userData.password,
          birthDate: new Date(userData.birthDate),
          addresses: { createMany: { data: userData.addresses } },
        },
        include: { addresses: true },
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
        addresses: [{ id: dbUser.addresses[0].id, ...foundUser.addresses[0] }],
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
            code: 404,
            message: 'User does not exist.',
            additionalInfo: 'No user with the specified ID could be found.',
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
          addresses: { createMany: { data: userData.addresses } },
        },
        include: { addresses: true },
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
            code: 401,
            message: 'Unauthenticated user.',
            additionalInfo: 'The JWT is either missing or invalid.',
          },
        ],
      });
    });
  });
}
