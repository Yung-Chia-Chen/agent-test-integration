import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

// Optionally, if not using email/password login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// Only initialize database if POSTGRES_URL is properly configured
// This allows the app to work without a database for guest-only mode
const postgresUrl = process.env.POSTGRES_URL;
const isValidPostgresUrl = postgresUrl && 
  postgresUrl !== '****' && 
  (postgresUrl.startsWith('postgres://') || postgresUrl.startsWith('postgresql://'));

export const db = isValidPostgresUrl 
  ? drizzle(postgres(postgresUrl), { schema })
  : null as any; // Fallback for when database is not configured
