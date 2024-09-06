import { initializeDatabaseInstance, startServer } from './server.js';

initializeDatabaseInstance();
const { url } = await startServer(parseInt(process.env.SERVER_PORT));
console.log(`Server ready at: ${url}`);
