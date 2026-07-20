import { Router, Request, Response } from 'express';
import { getDb } from '../lib/db';

export const statsRouter = Router();

// GET /stats — MongoDB aggregation: category-wise item count + avgPrice for Recharts
statsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
        const db = await getDb();

        const pipeline = [
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    avgPrice: { $avg: '$price' },
                },
            },
            {
                $project: {
                    category: '$_id',
                    _id: 0,
                    count: 1,
                    avgPrice: { $round: ['$avgPrice', 2] },
                },
            },
            {
                $sort: { count: -1 as -1 },
            },
        ];

        const result = await db.collection('items').aggregate(pipeline).toArray();
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: 'Failed to fetch stats', error: (error as Error).message });
    }
});
