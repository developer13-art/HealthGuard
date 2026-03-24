import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket with SSL handling for Replit environment
class CustomWebSocket extends ws {
  constructor(address: string, protocols?: string | string[]) {
    super(address, protocols, {
      rejectUnauthorized: false
    });
  }
}

neonConfig.webSocketConstructor = CustomWebSocket as any;
neonConfig.pipelineConnect = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Normalize the DATABASE_URL to use sslmode=require and channel_binding=require
// regardless of what is set in the environment (handles Replit's managed URL
// which may default to sslmode=verify-full that can fail in some environments)
function normalizeDbUrl(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("sslmode", "require");
  parsed.searchParams.set("channel_binding", "require");
  return parsed.toString();
}

const connectionString = normalizeDbUrl(process.env.DATABASE_URL);

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
