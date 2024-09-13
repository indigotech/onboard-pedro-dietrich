import { startServer, url } from './server/server.js';
import { initializeDatabaseInstance } from './database.js';

initializeDatabaseInstance();
await startServer(parseInt(process.env.SERVER_PORT));
console.log(`Server ready at: ${url}`);
