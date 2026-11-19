import dotenv from 'dotenv';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './db-schema';

dotenv.config({ path: '.env.development.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the application API.');
}

export const pool = new Pool({ connectionString, max: 5 });
export const db = drizzle(pool, { schema });
