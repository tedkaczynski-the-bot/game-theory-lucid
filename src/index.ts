import { app } from './lib/agent';

const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

console.log(`Starting game-theory agent on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
