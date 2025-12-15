import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './libs/database/src/schema',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
