import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'))) {
    console.warn('WARNING: MONGODB_URI is not set or invalid. Database operations will fail.');
}

// Singleton client — shared across all routes to prevent connection exhaustion.
let client: MongoClient | null = uri ? new MongoClient(uri) : null;
let db: Db | null = null;
let connectionPromise: Promise<void> | null = null;

async function connect(): Promise<void> {
    if (!client) throw new Error('Database client not initialized: MONGODB_URI missing or invalid');
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    db = client.db('craftfolio_db');
}

/**
 * Returns the shared MongoDB Db instance.
 * Establishes the connection on first call; subsequent calls reuse the pool.
 */
export async function getDb(): Promise<Db> {
    if (db) return db;

    if (!connectionPromise) {
        connectionPromise = connect().catch((err) => {
            // Reset so the next request can retry
            connectionPromise = null;
            throw err;
        });
    }

    await connectionPromise;

    if (!db) throw new Error('Database connection failed');
    return db;
}

/**
 * Expose the raw client for libraries that need it (e.g. transactions).
 */
export function getClient(): MongoClient {
    if (!client) throw new Error('Database client not initialized');
    return client;
}
