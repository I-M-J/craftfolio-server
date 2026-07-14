import { Response, NextFunction } from 'express';
import { MongoClient } from 'mongodb';
import { AuthRequest } from '../types';

const uri = process.env.MONGODB_URI;
const adminClient = uri && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'))
    ? new MongoClient(uri)
    : null;

export const verifyAdmin = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const email = req.user?.email;

    if (!email) {
        res.status(403).send({ message: 'Forbidden access' });
        return;
    }

    try {
        if (!adminClient) {
            res.status(503).send({ message: 'Database not available' });
            return;
        }
        await adminClient.connect();
        const db = adminClient.db('craftfolio_db');
        const user = await db.collection('users').findOne({ email });

        if (!user || user.role !== 'admin') {
            res.status(403).send({ message: 'Forbidden access: Admin only' });
            return;
        }

        next();
    } catch (err) {
        res.status(500).send({ message: 'Internal error', error: (err as Error).message });
    }
};
