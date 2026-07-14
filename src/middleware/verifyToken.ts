import { Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose-cjs';
import { AuthRequest } from '../types';

export const verifyToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).send({ message: 'Unauthorized access: Missing token' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        const JWKS = createRemoteJWKSet(new URL(`${clientUrl}/api/auth/jwks`));
        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload as AuthRequest['user'];
        next();
    } catch (error) {
        res.status(403).send({ message: 'Forbidden access: Invalid token', error: (error as Error).message });
    }
};
