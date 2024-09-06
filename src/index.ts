import { startServer } from './server.js';

const { url } = await startServer(4000);
console.log(`Server ready at: ${url}`);
