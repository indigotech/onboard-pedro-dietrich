import { ApolloServer } from '@apollo/server';

import { startServer } from '../src/server/server.js';
import { initializeDatabaseInstance } from '../src/database.js';

let server: ApolloServer;

before(async function () {
  initializeDatabaseInstance();
  ({ server } = await startServer(+process.env.SERVER_PORT));
});

after(async function () {
  await server.stop();
});

import './hello/hello.js';
import './user/user.js';
import './login/login.js';
