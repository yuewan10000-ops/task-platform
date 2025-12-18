import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get DATABASE_URL from environment
const url = process.env.DATABASE_URL;
if (!url) {
  // Only allow placeholder for generate command
  const isGenerateCommand = process.argv.some(arg => arg.includes('generate') || arg.includes('prisma') && process.argv.includes('generate'));
  if (isGenerateCommand) {
    // For generate, we can use a placeholder
    process.env.DATABASE_URL = 'mysql://placeholder:placeholder@localhost:3306/placeholder';
  } else {
    throw new Error('DATABASE_URL is not set. Please export it before running Prisma commands.');
  }
}

export default defineConfig({
  datasource: {
    provider: 'mysql',
    url,
  },
  generators: [
    {
      name: 'client',
      provider: 'prisma-client-js',
      output: './src/generated/prisma',
    },
  ],
});

