import postgres from "postgres";

// Initialize Supabase PostgreSQL connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set. Please configure your Supabase connection in .env");
}

console.log("🔗 Connecting to Supabase PostgreSQL database...");

// Create Supabase connection
export const sql = postgres(connectionString);

console.log("✅ Connected to Supabase PostgreSQL database");
