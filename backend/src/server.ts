import app from './app';
import { disconnectPrisma } from './prisma';

const port = process.env.PORT ?? 3000;

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

const shutdown = async (signal: NodeJS.Signals) => {
  console.log(`Received ${signal}, shutting down...`);
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

