import { startServer } from './server/server.js';
import { initializeDatabaseInstance } from './database.js';

initializeDatabaseInstance();
const { url } = await startServer(parseInt(process.env.SERVER_PORT));
console.log(`Server ready at: ${url}`);
