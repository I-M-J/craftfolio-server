import { Router, Request, Response } from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyToken } from '../middleware/verifyToken';
import { AuthRequest } from '../types';

export const itemsRouter = Router();

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

// GET /items/featured — 8 items for homepage (must come before /:id)
itemsRouter.get('/featured', async (_req: Request, res: Response): Promise<void> => {
    try {
        const db = await getDb();
        const items = await db.collection('items')
            .find({})
            .sort({ avgRating: -1 })
            .limit(8)
            .toArray();
        res.send(items);
    } catch (error) {
        res.status(500).send({ message: 'Failed to fetch featured items', error: (error as Error).message });
    }
});

// GET /items — list with search, filter, sort, pagination
itemsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, category, minPrice, maxPrice, sortBy, page, limit, sellerEmail } = req.query as {
            search?: string;
            category?: string;
            minPrice?: string;
            maxPrice?: string;
            sortBy?: string;
            page?: string;
            limit?: string;
            sellerEmail?: string;
        };

        const db = await getDb();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: Record<string, any> = {};

        if (sellerEmail) {
            query.sellerEmail = sellerEmail;
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { shortDescription: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
                { sellerName: { $regex: search, $options: 'i' } },
            ];
        }

        if (category) {
            query.category = { $regex: category, $options: 'i' };
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        // Sort options
        let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
        if (sortBy === 'price_asc') sortOption = { price: 1 };
        else if (sortBy === 'price_desc') sortOption = { price: -1 };
        else if (sortBy === 'rating') sortOption = { avgRating: -1 };

        const parsedPage = parseInt(page || '1') || 1;
        const parsedLimit = parseInt(limit || '12') || 12;
        const skip = (parsedPage - 1) * parsedLimit;

        const total = await db.collection('items').countDocuments(query);
        const items = await db.collection('items')
            .find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(parsedLimit)
            .toArray();

        res.send({ total, items, page: parsedPage, totalPages: Math.ceil(total / parsedLimit) });
    } catch (error) {
        res.status(500).send({ message: 'Failed to fetch items', error: (error as Error).message });
    }
});

// GET /items/:id — single item detail
itemsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        if (!ObjectId.isValid(id)) {
            res.status(400).send({ message: 'Invalid item ID' });
            return;
        }
        const db = await getDb();
        const query = { _id: new ObjectId(id) };
        const item = await db.collection('items').findOne(query);
        if (!item) {
            res.status(404).send({ message: 'Item not found' });
            return;
        }
        res.send(item);
    } catch (error) {
        res.status(500).send({ message: 'Failed to fetch item', error: (error as Error).message });
    }
});

// POST /items — add item (verifyToken)
itemsRouter.post('/', verifyToken as unknown as (req: Request, res: Response, next: () => void) => void, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const item = req.body as {
            title: string;
            shortDescription: string;
            fullDescription: string;
            category: string;
            price: number;
            imageUrl: string;
            sellerName?: string;
            tags?: string[];
        };
        const db = await getDb();

        const newItem = {
            ...item,
            sellerEmail: req.user?.email || '',
            sellerName: item.sellerName || req.user?.name || 'Anonymous',
            avgRating: 0,
            totalReviews: 0,
            createdAt: new Date(),
        };

        const result = await db.collection('items').insertOne(newItem);
        res.status(201).send(result);
    } catch (error) {
        res.status(500).send({ message: 'Failed to create item', error: (error as Error).message });
    }
});

// PATCH /items/:id — update item (verifyToken + owner check)
itemsRouter.patch('/:id', verifyToken as unknown as (req: Request, res: Response, next: () => void) => void, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        if (!ObjectId.isValid(id)) {
            res.status(400).send({ message: 'Invalid item ID' });
            return;
        }

        const db = await getDb();
        const item = await db.collection('items').findOne({ _id: new ObjectId(id) });

        if (!item) {
            res.status(404).send({ message: 'Item not found' });
            return;
        }

        if (item.sellerEmail !== req.user?.email) {
            res.status(403).send({ message: 'Forbidden: You can only update your own items' });
            return;
        }

        const updatedData = { ...req.body };
        delete updatedData._id;

        const filter = { _id: new ObjectId(id) };
        const updateDoc = { $set: updatedData };
        const result = await db.collection('items').updateOne(filter, updateDoc);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: 'Failed to update item', error: (error as Error).message });
    }
});

// DELETE /items/:id — delete item (verifyToken + owner check)
itemsRouter.delete('/:id', verifyToken as unknown as (req: Request, res: Response, next: () => void) => void, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id);
        if (!ObjectId.isValid(id)) {
            res.status(400).send({ message: 'Invalid item ID' });
            return;
        }

        const db = await getDb();
        const item = await db.collection('items').findOne({ _id: new ObjectId(id) });

        if (!item) {
            res.status(404).send({ message: 'Item not found' });
            return;
        }

        // Allow owner or admin to delete
        const email = req.user?.email;
        const userDoc = await db.collection('users').findOne({ email });
        const isAdmin = userDoc?.role === 'admin';

        if (item.sellerEmail !== email && !isAdmin) {
            res.status(403).send({ message: 'Forbidden: You can only delete your own items' });
            return;
        }

        const query = { _id: new ObjectId(id) };
        const result = await db.collection('items').deleteOne(query);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: 'Failed to delete item', error: (error as Error).message });
    }
});
