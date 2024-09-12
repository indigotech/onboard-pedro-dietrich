import axios from 'axios';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { url } from '../../src/server/server.js';
import { prisma, DatabaseUserData } from '../../src/database.js';

export default function () {
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
      await prisma.address.deleteMany({});
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
            addresses {
              cep
            }
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
          addresses: [],
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
          addresses: [],
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
            code: 401,
            message: 'Unauthenticated user.',
            additionalInfo: 'The JWT is either missing or invalid.',
          },
        ],
      });
    });
  });
}
