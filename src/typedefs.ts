export const typeDefs = `#graphql
  input GetUserInput {
    id: ID!
  }

  input UserListInput {
    userLimit: Int = 10
    offset: Int = 0
  }

  input AddressInput {
    cep: Int!
    street: String!
    streetNumber: Int!
    complement: Int
    neighborhood: String!
    city: String!
    state: String!
  }

  input UserInput {
    name: String!
    email: String!
    password: String!
    birthDate: String!
    addresses: [AddressInput!]
  }

  input LoginInput {
    email: String!
    password: String!
    rememberMe: Boolean
  }

  type User {
    id: ID!
    name: String!
    email: String!
    birthDate: String!
    addresses: [Address]!
  }

  type UserList {
    users: [User]!
    totalUsers: Int!
    offset: Int!
    lastPage: Boolean!
  }

  type Address {
    id: ID!
    cep: Int!
    street: String!
    streetNumber: Int!
    complement: Int
    neighborhood: String!
    city: String!
    state: String!
    user: User!
  }

  type Authentication {
    user: User!
    token: String!
  }

  type Query {
    hello: String!
    user(userId: GetUserInput!): User
    users(usersInput: UserListInput! = { userLimit: 10, offset: 0 }): UserList!
  }

  type Mutation {
    createUser(user: UserInput!): User
    login(loginInput: LoginInput!): Authentication
  }
`;

export interface GetUserInput {
  id: number;
}

export interface UserListInput {
  userLimit: number;
  offset: number;
}

export interface UserInput {
  name: string;
  email: string;
  password: string;
  birthDate: string;
  addresses?: AddressInput[];
}

export interface AddressInput {
  cep: number;
  street: string;
  streetNumber: number;
  complement?: number;
  neighborhood: string;
  city: string;
  state: string;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  birthDate: Date;
  addresses?: Address[];
}

export interface UserList {
  users: User[];
  totalUsers: number;
  offset: number;
  lastPage: boolean;
}

export interface Address {
  id: number;
  cep: number;
  street: string;
  streetNumber: number;
  complement?: number;
  neighborhood: string;
  city: string;
  state: string;
  userId: number;
}

export interface Authentication {
  user: User;
  token: string;
}
