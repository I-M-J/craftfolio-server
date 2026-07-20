import { Response, NextFunction } from 'express';
import { getDb } from '../lib/db';
import { AuthRequest } from '../types';

/**
 * Middleware: verifies that the authenticated user has the 'admin' role in the database.
 * Must be used after verifyToken so that req.user is already populated.
 */
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
        const db = await getDb();
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
