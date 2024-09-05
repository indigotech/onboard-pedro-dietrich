import { startDatabase, startServer } from './server.js';

startDatabase();
const { url } = await startServer(parseInt(process.env.SERVER_PORT));
console.log(`Server ready at: ${url}`);
