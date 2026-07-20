import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../lib/db';
import { verifyToken } from '../middleware/verifyToken';
import { verifyAdmin } from '../middleware/verifyAdmin';
import { AuthRequest } from '../types';

export const usersRouter = Router();

// GET /users — all users (admin only)
usersRouter.get(
    '/',
    verifyToken as unknown as (req: Request, res: Response, next: () => void) => void,
    verifyAdmin as unknown as (req: Request, res: Response, next: () => void) => void,
    async (_req: Request, res: Response): Promise<void> => {
        try {
            const db = await getDb();
            const result = await db.collection('users').find({}).toArray();
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: 'Failed to fetch users', error: (error as Error).message });
        }
    }
);

// GET /users/me — current user profile
usersRouter.get(
    '/me',
    verifyToken as unknown as (req: Request, res: Response, next: () => void) => void,
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const email = req.user?.email;
            const db = await getDb();
            const user = await db.collection('users').findOne({ email });
            res.send(user || {});
        } catch (error) {
            res.status(500).send({ message: 'Failed to fetch user', error: (error as Error).message });
        }
    }
);

// GET /users/email/:email — public seller profile (no auth required)
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

// POST /users — create/sync user on registration
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

// PATCH /users/:id/role — update user role (admin only)
usersRouter.patch(
    '/:id/role',
    verifyToken as unknown as (req: Request, res: Response, next: () => void) => void,
    verifyAdmin as unknown as (req: Request, res: Response, next: () => void) => void,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const id = String(req.params.id);
            const { role } = req.body as { role: string };
            const db = await getDb();
            const result = await db.collection('users').updateOne(
                { _id: new ObjectId(id) },
                { $set: { role } }
            );
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: 'Failed to update user role', error: (error as Error).message });
        }
    }
);

// DELETE /users/:id — delete user (admin only)
usersRouter.delete(
    '/:id',
    verifyToken as unknown as (req: Request, res: Response, next: () => void) => void,
    verifyAdmin as unknown as (req: Request, res: Response, next: () => void) => void,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const id = String(req.params.id);
            const db = await getDb();
            const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        } catch (error) {
            res.status(500).send({ message: 'Failed to delete user', error: (error as Error).message });
        }
    }
);
