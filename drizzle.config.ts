import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './libs/database/src/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://eventflowapp:eventflow_password@localhost:5432/eventflowapp?schema=public',
  },
});
