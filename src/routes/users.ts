import { Router, Request, Response } from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyToken } from '../middleware/verifyToken';
import { verifyAdmin } from '../middleware/verifyAdmin';
import { AuthRequest } from '../types';

export const usersRouter = Router();

let client: MongoClient | null = null;

const getDb = async () => {
    if (!client) {
        const uri = process.env.MONGODB_URI;
        if (uri && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'))) {
            client = new MongoClient(uri);
        } else {
            throw new Error('Database client not initialized: MONGODB_URI missing');
        }
    }
    await client.connect();
    return client.db('craftfolio_db');
};

// GET /users — all users (admin only)
usersRouter.get('/', verifyToken as unknown as (req: Request, res: Response, next: () => void) => void, verifyAdmin as unknown as (req: Request, res: Response, next: () => void) => void, async (_req: Request, res: Response): Promise<void> => {
    try {
        const db = await getDb();
        const result = await db.collection('users').find({}).toArray();
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: 'Failed to fetch users', error: (error as Error).message });
    }
});

// GET /users/me — current user profile
usersRouter.get('/me', verifyToken as unknown as (req: Request, res: Response, next: () => void) => void, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const email = req.user?.email;
        const db = await getDb();
        const user = await db.collection('users').findOne({ email });
        res.send(user || {});
    } catch (error) {
        res.status(500).send({ message: 'Failed to fetch user', error: (error as Error).message });
    }
});

// GET /users/email/:email — get public user details
usersRouter.get('/email/:email', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email } = req.params;
        const db = await getDb();
        const user = await db.collection('users').findOne({ email });
        if (!user) {
            res.status(404).send({ message: 'User not found' });
            return;
        }
        res.send({
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            createdAt: user.createdAt,
        });
    } catch (error) {
        res.status(500).send({ message: 'Failed to fetch user', error: (error as Error).message });
    }
});

// POST /users — create/sync user on login
usersRouter.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.body as { email: string; name: string; image?: string; role?: string };
        const db = await getDb();
        const existing = await db.collection('users').findOne({ email: user.email });

        if (existing) {
            res.send({ message: 'User already exists', inserted: false });
            return;
        }

        const newUser = {
            ...user,
            role: user.email === (process.env.ADMIN_EMAIL || 'admin@craftfolio.com') ? 'admin' : 'user',
            createdAt: new Date(),
        };

        const result = await db.collection('users').insertOne(newUser);
        res.status(201).send(result);
    } catch (error) {
        res.status(500).send({ message: 'Failed to create user', error: (error as Error).message });
    }
});

// PATCH /users/:id/role — update role (admin only)
usersRouter.patch('/:id/role', verifyToken as unknown as (req: Request, res: Response, next: () => void) => void, verifyAdmin as unknown as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const { role } = req.body as { role: string };
        const db = await getDb();
        const filter = { _id: new ObjectId(id) };
        const updateDoc = { $set: { role } };
        const result = await db.collection('users').updateOne(filter, updateDoc);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: 'Failed to update user role', error: (error as Error).message });
    }
});

// DELETE /users/:id — delete user (admin only)
usersRouter.delete('/:id', verifyToken as unknown as (req: Request, res: Response, next: () => void) => void, verifyAdmin as unknown as (req: Request, res: Response, next: () => void) => void, async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        const db = await getDb();
        const query = { _id: new ObjectId(id) };
        const result = await db.collection('users').deleteOne(query);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: 'Failed to delete user', error: (error as Error).message });
    }
});
