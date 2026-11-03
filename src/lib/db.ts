import "server-only";
import mongoose from "mongoose";

// Same database as the customer storefront.
const DB_HOST = process.env.DB_HOST ?? "cluster0.vvjno4o.mongodb.net";
const DB_NAME = process.env.DB_NAME ?? "brobazz";

// Reuse one connection across hot reloads and requests instead of opening a new one each time.
const globalForMongoose = globalThis as typeof globalThis & {
  mongooseConnection?: Promise<typeof mongoose>;
};

function connectionString() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;

  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (!user || !password) throw new Error("Set MONGODB_URI, or DB_USER and DB_PASSWORD, in .env");
  return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${DB_HOST}/?retryWrites=true&w=majority&appName=Cluster0`;
}

export function connectToDatabase() {
  globalForMongoose.mongooseConnection ??= mongoose
    .connect(connectionString(), { dbName: DB_NAME })
    .catch((error) => {
      // Let the next request retry instead of caching the failure.
      globalForMongoose.mongooseConnection = undefined;
      throw error;
    });

  return globalForMongoose.mongooseConnection;
}
