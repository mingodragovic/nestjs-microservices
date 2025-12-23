import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool;
  public db: NodePgDatabase<typeof schema>;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://eventflowapp:eventflow_password@localhost:5432/eventflowapp?schema=public';

    this.pool = new Pool({ connectionString });
    this.db = drizzle(this.pool, { schema });

    console.log('Database connected');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  get schema() {
    return schema;
  }
}
