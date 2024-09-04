import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const typeDefs = `#graphql
  type Query {
    hello: String!
  }

  input UserInput {
    name: String!
    email: String!
    password: String!
    birthDate: String!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    birthDate: String!
  }

  type Mutation {
    createUser(user: UserInput!): User
  }
`;

interface UserInput {
  name: string;
  email: string;
  password: string;
  birthDate: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  birthDate: string;
}

const users: User[] = [];

const resolvers = {
  Query: {
    hello: () => 'Hello World!',
  },
  Mutation: {
    createUser: (_, args: { user: UserInput }): User => {
      const id = Math.floor(Math.random() * 100000);

      const user = { ...args.user, id: id };
      users.push(user);

      return user;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`Server ready at: ${url}`);
