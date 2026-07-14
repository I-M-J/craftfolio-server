import { Router, Request, Response } from 'express';
import { MongoClient } from 'mongodb';

export const statsRouter = Router();

const uri = process.env.MONGODB_URI;
const client = uri && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'))
    ? new MongoClient(uri)
    : null;

const getDb = async () => {
    if (!client) throw new Error('Database client not initialized');
    await client.connect();
    return client.db('craftfolio_db');
};

// GET /stats — MongoDB aggregation: category-wise item count for Recharts
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
