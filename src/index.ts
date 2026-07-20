require('dotenv').config();
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

import { usersRouter } from './routes/users';
import { itemsRouter } from './routes/items';
import { reviewsRouter } from './routes/reviews';
import { statsRouter } from './routes/stats';

const app = express();
const port = process.env.PORT || 5000;

// ============================================================
// CORS CONFIGURATION
// ============================================================
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.CLIENT_URL,
            'http://localhost:3000',
            'http://localhost:3001',
        ].filter(Boolean) as string[];

        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(express.json());

// ============================================================
// MONGODB CONNECTION
// ============================================================
const uri = process.env.MONGODB_URI;
let client: MongoClient | null = null;

if (uri && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'))) {
    client = new MongoClient(uri);
} else {
    console.warn('WARNING: MONGODB_URI is not set or invalid. Check your .env file.');
}

export let usersCollection: ReturnType<MongoClient['db']>['collection'] | null = null;
export let itemsCollection: ReturnType<MongoClient['db']>['collection'] | null = null;
export let reviewsCollection: ReturnType<MongoClient['db']>['collection'] | null = null;

let dbConnectionPromise: Promise<void> | null = null;

async function connectDB(): Promise<void> {
    if (!client) {
        console.warn('Skipping MongoDB connection: client not initialized.');
        return;
    }

    try {
        await client.connect();
        await client.db('admin').command({ ping: 1 });
        console.log('Pinged your deployment. Successfully connected to MongoDB!');

        const db = client.db('craftfolio_db');
        usersCollection = db.collection('users') as unknown as typeof usersCollection;
        itemsCollection = db.collection('items') as unknown as typeof itemsCollection;
        reviewsCollection = db.collection('reviews') as unknown as typeof reviewsCollection;
    } catch (error) {
        console.error('Database connection error:', error);
        dbConnectionPromise = null;
        throw error;
    }
}

if (process.env.NODE_ENV !== 'production') {
    dbConnectionPromise = connectDB();
}

// ============================================================
// DB CONNECTION CHECK MIDDLEWARE
// ============================================================
const checkDbConnection = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
): Promise<void> => {
    if (!itemsCollection) {
        if (dbConnectionPromise) {
            try {
                await dbConnectionPromise;
            } catch (err) {
                res.status(503).send({ message: 'Service Unavailable: Database connection failed.', error: (err as Error).message });
                return;
            }
        } else {
            try {
                dbConnectionPromise = connectDB();
                await dbConnectionPromise;
            } catch (err) {
                res.status(503).send({ message: 'Service Unavailable: Could not connect to database.', error: (err as Error).message });
                return;
            }
        }
    }
    next();
};

app.use(checkDbConnection);

// ============================================================
// ROUTES
// ============================================================
app.get('/', (_req, res) => {
    res.send('🛖 Craftfolio Server is running — artisan marketplace API');
});

app.use('/users', usersRouter);
app.use('/items', itemsRouter);
app.use('/reviews', reviewsRouter);
app.use('/stats', statsRouter);

// ============================================================
// START SERVER
// ============================================================
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Craftfolio Server is running on port: ${port}`);
    });
}

export default app;
