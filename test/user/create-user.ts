import axios from 'axios';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';

import { url } from '../../src/server/server.js';
import { User, UserInput } from '../../src/typedefs.js';
import { prisma, DatabaseUserData } from '../../src/database.js';

export default function () {
  describe('#Create user mutation', async function () {
    const userInput: UserInput = {
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
        {
          cep: 87654321,
          street: 'User Street',
          streetNumber: 321,
          complement: 2,
          neighborhood: 'User Neighborhood',
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

    const createUserQuery = `#graphql
    mutation CreateUserMutation($user: UserInput!) {
      createUser(user: $user) {
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

    const createUserMutation = {
      operationName: 'CreateUserMutation',
      query: createUserQuery,
      variables: { user: userInput },
    };

    it('should store user in the database and return it to client', async function () {
      const response = await axios.post(url, createUserMutation);
      const createdUser: User = response.data.data.createUser;
      const databaseUserInfo: DatabaseUserData = await prisma.user.findUnique({
        where: { email: userInput.email },
        include: { addresses: true },
      });

      expect(databaseUserInfo.name).to.be.eq(userInput.name);
      expect(databaseUserInfo.email).to.be.eq(userInput.email);
      expect(databaseUserInfo.birthDate).to.be.deep.eq(new Date(userInput.birthDate));
      expect(bcrypt.compareSync(userInput.password, databaseUserInfo.password)).to.be.eq(true);

      expect(createdUser).to.be.deep.eq({
        id: databaseUserInfo.id.toString(),
        name: userInput.name,
        email: userInput.email,
        birthDate: new Date(userInput.birthDate).getTime().toString(),
        addresses: [
          { id: databaseUserInfo.addresses[0].id.toString(), ...userInput.addresses[0] },
          { id: databaseUserInfo.addresses[1].id.toString(), ...userInput.addresses[1] },
        ],
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
            code: 401,
            message: 'Unauthenticated user.',
            additionalInfo: 'The JWT is either missing or invalid.',
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
          addresses: { createMany: { data: [] } },
        },
        include: { addresses: true },
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
            code: 400,
            message: 'E-mail is already in use.',
            additionalInfo: 'The e-mail must be unique, and the one received is already present in the database.',
          },
        ],
      });
    });

    it('should fail to create user with weak password', async function () {
      const newUserInput = JSON.parse(JSON.stringify(userInput));
      newUserInput.password = 'weak_password';
      const weakCreateUserMutation = {
        operationName: 'CreateUserMutation',
        query: createUserQuery,
        variables: { user: newUserInput },
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
            code: 400,
            message: 'Invalid password.',
            additionalInfo: 'Password needs to contain at least 6 characters, with at least 1 letter and 1 digit.',
          },
        ],
      });
    });

    it('should fail to create user with invalid birth date', async function () {
      const newUserInput = JSON.parse(JSON.stringify(userInput));
      newUserInput.birthDate = '2100-12-31';
      const invalidBdayCreateUserMutation = {
        operationName: 'CreateUserMutation',
        query: createUserQuery,
        variables: { user: newUserInput },
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
            code: 400,
            message: 'Unreasonable birth date detected.',
            additionalInfo: 'The birth date must be between the year 1900 and the current date.',
          },
        ],
      });
    });
  });
}
