import { Router, Request, Response } from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyToken } from '../middleware/verifyToken';
import { AuthRequest } from '../types';

export const reviewsRouter = Router();

const uri = process.env.MONGODB_URI;
const client = uri && (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'))
    ? new MongoClient(uri)
    : null;

const getDb = async () => {
    if (!client) throw new Error('Database client not initialized');
    await client.connect();
    return client.db('craftfolio_db');
};

// GET /reviews — reviews by ?itemId=
reviewsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { itemId, reviewerEmail, limit } = req.query as {
            itemId?: string;
            reviewerEmail?: string;
            limit?: string;
        };

        const db = await getDb();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: Record<string, any> = {};

        if (itemId) query.itemId = itemId;
        if (reviewerEmail) query.reviewerEmail = reviewerEmail;

        const parsedLimit = parseInt(limit || '0') || 0;
        const result = await db.collection('reviews')
            .find(query)
            .sort({ createdAt: -1 })
            .limit(parsedLimit)
            .toArray();

        res.send(result);
    } catch (error) {
        res.status(500).send({ message: 'Failed to fetch reviews', error: (error as Error).message });
    }
});

// POST /reviews — add review (verifyToken); recalculate item avgRating
reviewsRouter.post('/', verifyToken as unknown as (req: Request, res: Response, next: () => void) => void, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const review = req.body as {
            itemId: string;
            rating: number;
            comment: string;
            reviewerName?: string;
            reviewerAvatar?: string;
        };

        const db = await getDb();
        const newReview = {
            ...review,
            reviewerEmail: req.user?.email || '',
            reviewerName: review.reviewerName || req.user?.name || 'Anonymous',
            createdAt: new Date(),
        };

        const result = await db.collection('reviews').insertOne(newReview);

        // Recalculate avgRating on the item
        if (review.itemId && ObjectId.isValid(review.itemId)) {
            const allReviews = await db.collection('reviews')
                .find({ itemId: review.itemId })
                .toArray();

            const avgRating = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / allReviews.length;

            await db.collection('items').updateOne(
                { _id: new ObjectId(review.itemId) },
                {
                    $set: {
                        avgRating: Math.round(avgRating * 10) / 10,
                        totalReviews: allReviews.length,
                    },
                }
            );
        }

        res.status(201).send(result);
    } catch (error) {
        res.status(500).send({ message: 'Failed to create review', error: (error as Error).message });
    }
});

// DELETE /reviews/:id — delete review (verifyToken + owner/admin check)
reviewsRouter.delete('/:id', verifyToken as unknown as (req: Request, res: Response, next: () => void) => void, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
            res.status(400).send({ message: 'Invalid review ID' });
            return;
        }

        const db = await getDb();
        const review = await db.collection('reviews').findOne({ _id: new ObjectId(id) });

        if (!review) {
            res.status(404).send({ message: 'Review not found' });
            return;
        }

        const email = req.user?.email;
        const userDoc = await db.collection('users').findOne({ email });
        const isAdmin = userDoc?.role === 'admin';

        if (review.reviewerEmail !== email && !isAdmin) {
            res.status(403).send({ message: 'Forbidden: You can only delete your own reviews' });
            return;
        }

        const query = { _id: new ObjectId(id) };
        const result = await db.collection('reviews').deleteOne(query);

        // Recalculate avgRating after deletion
        if (review.itemId && ObjectId.isValid(review.itemId)) {
            const remainingReviews = await db.collection('reviews')
                .find({ itemId: review.itemId })
                .toArray();

            const avgRating = remainingReviews.length > 0
                ? remainingReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / remainingReviews.length
                : 0;

            await db.collection('items').updateOne(
                { _id: new ObjectId(review.itemId) },
                {
                    $set: {
                        avgRating: Math.round(avgRating * 10) / 10,
                        totalReviews: remainingReviews.length,
                    },
                }
            );
        }

        res.send(result);
    } catch (error) {
        res.status(500).send({ message: 'Failed to delete review', error: (error as Error).message });
    }
});
