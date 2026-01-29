import { app } from './lib/agent';

const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

console.log(`Starting game-theory agent on port ${port}...`);

// Explicitly start server to keep process alive
const server = Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`✅ game-theory agent running on port ${server.port}`);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.stop();
  process.exit(0);
});
