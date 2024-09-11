export const typeDefs = `#graphql
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

  input LoginInput {
    email: String!
    password: String!
  }

  type Authentication {
    user: User!
    token: String!
  }

  type Mutation {
    createUser(user: UserInput!): User
    login(loginInput: LoginInput!): Authentication
  }
`;

export interface UserInput {
  name: string;
  email: string;
  password: string;
  birthDate: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  birthDate: Date;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface Authentication {
  user: User;
  token: string;
}
