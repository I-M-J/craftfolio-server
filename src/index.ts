require('dotenv').config();
import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';

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

        // Seed admin account and sample items on startup
        await seedAdmin(db);
        await seedItems(db);
    } catch (error) {
        console.error('Database connection error:', error);
        dbConnectionPromise = null;
        throw error;
    }
}

// ============================================================
// SEED ADMIN ACCOUNT
// ============================================================
async function seedAdmin(db: ReturnType<MongoClient['db']>): Promise<void> {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@craftfolio.com';
        const existing = await db.collection('users').findOne({ email: adminEmail });
        if (!existing) {
            await db.collection('users').insertOne({
                name: 'Craftfolio Admin',
                email: adminEmail,
                role: 'admin',
                createdAt: new Date(),
            });
            console.log('Admin account seeded successfully.');
        }
    } catch (err) {
        console.error('Admin seeding error:', (err as Error).message);
    }
}

// ============================================================
// SEED SAMPLE ITEMS
// ============================================================
async function seedItems(db: ReturnType<MongoClient['db']>): Promise<void> {
    try {
        const count = await db.collection('items').countDocuments();
        if (count > 0) {
            const hasEmma = await db.collection('items').findOne({ sellerEmail: 'emma@craftfolio.com' });
            if (hasEmma || count !== 12) {
                console.log('Old 12-seller seed data detected. Resetting items collection to seed 3 sellers...');
                try {
                    await db.collection('items').drop();
                } catch (dropErr) {
                    console.error('Error dropping items collection:', (dropErr as Error).message);
                }
            } else {
                return;
            }
        }

        const sampleItems = [
            {
                title: 'Handthrown Ceramic Mug',
                shortDescription: 'A beautifully handcrafted stoneware mug, glazed in earthy tones.',
                fullDescription: 'Each mug is individually thrown on the wheel and glazed by hand, making it truly one of a kind. The clay body is food-safe stoneware fired to cone 6, giving it a satisfying weight and durability for everyday use. The glaze flows naturally in the kiln, creating subtle variations of color that make each piece unique. Perfect for your morning coffee or evening tea ritual.',
                category: 'Ceramics',
                price: 24,
                imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800',
                sellerEmail: 'maya@craftfolio.com',
                sellerName: 'Maya Chen',
                avgRating: 4.9,
                totalReviews: 47,
                tags: ['mug', 'ceramic', 'handmade', 'stoneware'],
                createdAt: new Date('2026-06-15'),
            },
            {
                title: 'Macramé Wall Hanging',
                shortDescription: 'Intricate hand-knotted macramé art piece for your home.',
                fullDescription: 'This stunning wall hanging is crafted from 100% natural cotton rope, hand-knotted in a flowing bohemian design. Measuring approximately 24" wide and 36" long, it makes a striking statement above a sofa, bed, or fireplace. Each knot is tied by hand with care and intention. The fringe is carefully combed and trimmed to create a soft, feathered finish. A wooden dowel is included for easy hanging.',
                category: 'Textile & Fiber',
                price: 65,
                imageUrl: 'https://i.pinimg.com/originals/6b/b3/99/6bb399bc151b882366a0caf9ffb92e63.jpg',
                sellerEmail: 'layla@craftfolio.com',
                sellerName: 'Layla Osman',
                avgRating: 4.8,
                totalReviews: 32,
                tags: ['macrame', 'wall art', 'boho', 'cotton'],
                createdAt: new Date('2026-06-18'),
            },
            {
                title: 'Hand-stitched Leather Wallet',
                shortDescription: 'Slim bifold wallet crafted from full-grain vegetable-tanned leather.',
                fullDescription: 'Cut and stitched entirely by hand from premium full-grain vegetable-tanned leather, this slim bifold wallet develops a beautiful patina with use. Features 4 card slots, a center cash pocket, and an ID window. The saddle-stitch technique used creates a bond twice as strong as machine sewing — if one stitch breaks, the rest hold firm. Measures 4.5" x 3.5" when closed. Natural tan color will deepen over time with your own personal patina.',
                category: 'Leather',
                price: 48,
                imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800',
                sellerEmail: 'james@craftfolio.com',
                sellerName: 'James Kowalski',
                avgRating: 4.7,
                totalReviews: 28,
                tags: ['wallet', 'leather', 'bifold', 'handmade'],
                createdAt: new Date('2026-06-20'),
            },
            {
                title: 'Soy Wax Lavender Candle',
                shortDescription: 'Calming lavender-scented soy candle in a reusable glass jar.',
                fullDescription: 'Poured by hand using 100% natural soy wax and pure lavender essential oil, this candle burns cleanly for up to 45 hours. The cotton wick is lead-free and pre-waxed for a consistent, even burn. Housed in a thick-walled glass jar that can be repurposed as a drinking glass or small planter once the candle is finished. Each candle is hand-labeled and contains no synthetic fragrances or additives — just real lavender.',
                category: 'Candles & Soaps',
                price: 18,
                imageUrl: 'https://m.media-amazon.com/images/S/aplus-media-library-service-media/5a29bc4f-27b3-48c9-8a09-cb7a8dbb0adc.__CR0,0,1600,1200_PT0_SX800_V1___.jpg',
                sellerEmail: 'maya@craftfolio.com',
                sellerName: 'Maya Chen',
                avgRating: 4.9,
                totalReviews: 84,
                tags: ['candle', 'lavender', 'soy', 'aromatherapy'],
                createdAt: new Date('2026-06-22'),
            },
            {
                title: 'Carved Walnut Cheese Board',
                shortDescription: 'Handcrafted end-grain walnut serving board with juice groove.',
                fullDescription: 'Crafted from a single piece of Black Walnut hardwood, this end-grain cutting board is both a functional kitchen tool and a showpiece for entertaining. The end-grain surface is self-healing — knife marks close on their own — and gentler on blades than edge-grain boards. A carved juice groove runs the perimeter to catch liquids. Finished with food-safe mineral oil and beeswax. Dimensions: 16" × 10" × 1.5". Handwashing recommended.',
                category: 'Woodwork',
                price: 72,
                imageUrl: 'https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=800',
                sellerEmail: 'layla@craftfolio.com',
                sellerName: 'Layla Osman',
                avgRating: 4.8,
                totalReviews: 19,
                tags: ['cheese board', 'walnut', 'wood', 'kitchen'],
                createdAt: new Date('2026-06-25'),
            },
            {
                title: 'Hand-forged Silver Ring',
                shortDescription: 'Sterling silver band hammered and shaped entirely by hand.',
                fullDescription: 'Forged from a solid length of sterling silver (92.5% pure) wire, each ring is hammered into shape using traditional metalsmithing tools. The hammered texture catches and diffuses light beautifully, giving it a dynamic character that a cast ring simply cannot achieve. Available in sizes 5–11 (please note your size at checkout). Each ring is finished with a light polish, leaving the hammer textures visible. Hypoallergenic and nickel-free.',
                category: 'Jewelry',
                price: 55,
                imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
                sellerEmail: 'james@craftfolio.com',
                sellerName: 'James Kowalski',
                avgRating: 4.6,
                totalReviews: 53,
                tags: ['ring', 'silver', 'jewelry', 'forged'],
                createdAt: new Date('2026-06-28'),
            },
            {
                title: 'Embroidered Tote Bag',
                shortDescription: 'Hand-embroidered canvas tote with botanical motif.',
                fullDescription: 'This sturdy canvas tote features an original botanical embroidery design stitched entirely by hand using colorfast embroidery floss. The 12oz canvas body is thick enough to hold groceries or books without straining the straps. Dimensions: 15" wide × 16" tall with 10" cotton handles. The embroidered panel on the front depicts a meadow of wildflowers in earthy, earthy tones. Machine washable on gentle cycle. Each tote is a slightly unique original — the embroidery cannot be exactly replicated.',
                category: 'Textile & Fiber',
                price: 38,
                imageUrl: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800',
                sellerEmail: 'layla@craftfolio.com',
                sellerName: 'Layla Osman',
                avgRating: 4.7,
                totalReviews: 22,
                tags: ['tote', 'embroidery', 'canvas', 'botanical'],
                createdAt: new Date('2026-07-01'),
            },
            {
                title: 'Pressed Flower Art Frame',
                shortDescription: 'Real pressed wildflowers arranged in a handmade shadow box frame.',
                fullDescription: 'Real wildflowers are gathered, pressed for two weeks, and then carefully arranged into an original composition. Each piece is unique — no two arrangements are identical because the flowers themselves are never identical. The shadow box frame is handmade from reclaimed wood and includes UV-protective glass to prevent fading. Overall dimensions: 8" × 10" frame with a 5" × 7" floral arrangement. Includes a kraft paper backing with a description of the flowers used. A truly one-of-a-kind piece of nature-inspired art.',
                category: 'Mixed Media',
                price: 42,
                imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
                sellerEmail: 'maya@craftfolio.com',
                sellerName: 'Maya Chen',
                avgRating: 4.9,
                totalReviews: 36,
                tags: ['pressed flowers', 'art', 'frame', 'botanical'],
                createdAt: new Date('2026-07-03'),
            },
            {
                title: 'Indigo-Dyed Linen Table Runner',
                shortDescription: 'Hand-dyed linen runner in Japanese shibori indigo technique.',
                fullDescription: 'Each runner is dyed using traditional Japanese shibori technique — the linen is folded, twisted, or bound before being submerged in a natural indigo dye bath. This creates the distinctive resist patterns unique to each piece. The 100% linen base fabric is pre-washed for softness and stability. Dimensions: 14" wide × 72" long. Wash cold on gentle cycle; the indigo will slowly soften over time, which is a natural and beautiful characteristic of plant-based dyes.',
                category: 'Textile & Fiber',
                price: 44,
                imageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800',
                sellerEmail: 'james@craftfolio.com',
                sellerName: 'James Kowalski',
                avgRating: 4.8,
                totalReviews: 14,
                tags: ['table runner', 'indigo', 'shibori', 'linen'],
                createdAt: new Date('2026-07-05'),
            },
            {
                title: 'Beeswax Wrap Set (3 Pack)',
                shortDescription: 'Reusable food wraps made from organic cotton and local beeswax.',
                fullDescription: 'An eco-friendly alternative to plastic wrap, these beeswax wraps are made from organic cotton fabric coated with a blend of local beeswax, organic jojoba oil, and tree resin. The warmth of your hands softens the wrap, making it pliable enough to seal around bowls, sandwiches, fruits, and more. This set includes three sizes: small (7" × 8"), medium (10" × 11"), and large (13" × 14"). Wash in cool water with mild soap. Compostable at end of life. Scent is a light, clean honey fragrance.',
                category: 'Mixed Media',
                price: 22,
                imageUrl: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800',
                sellerEmail: 'maya@craftfolio.com',
                sellerName: 'Maya Chen',
                avgRating: 4.7,
                totalReviews: 61,
                tags: ['beeswax', 'eco', 'food wrap', 'sustainable'],
                createdAt: new Date('2026-07-07'),
            },
            {
                title: 'Oak Wood Pen Set',
                shortDescription: 'Handturned ballpoint pens from reclaimed white oak timber.',
                fullDescription: 'Turned on a wood lathe from reclaimed White Oak salvaged from an old barn, each pen has a grain pattern that tells the story of decades of growth. Fitted with a premium German refill and a twist mechanism, these pens write as beautifully as they look. Set of two pens included, presented in a hand-stitched leather roll. The wood is finished with multiple coats of friction polish, bringing out the natural warmth of the oak. A perfect gift for writers, artists, or anyone who appreciates well-made objects.',
                category: 'Woodwork',
                price: 58,
                imageUrl: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800',
                sellerEmail: 'layla@craftfolio.com',
                sellerName: 'Layla Osman',
                avgRating: 4.9,
                totalReviews: 27,
                tags: ['pen', 'oak', 'wood', 'writing'],
                createdAt: new Date('2026-07-09'),
            },
            {
                title: 'Origami Paper Crane Mobile',
                shortDescription: 'Hand-folded origami crane mobile with 100 cranes on silk thread.',
                fullDescription: 'Inspired by the Japanese legend of the Senbazuru — fold 1000 paper cranes and a wish will be granted — this mobile features 100 carefully folded cranes in a curated palette of earth tones and blush pinks. Each crane is folded by hand from acid-free washi paper using traditional origami technique. They are strung on invisible silk thread and suspended from a lacquered bamboo ring. Approx 20" in diameter, 36" hanging length. A meditative and meaningful piece of kinetic art.',
                category: 'Paper Craft',
                price: 35,
                imageUrl: 'https://images.unsplash.com/photo-1547127796-06bb04e4b315?w=800',
                sellerEmail: 'james@craftfolio.com',
                sellerName: 'James Kowalski',
                avgRating: 4.8,
                totalReviews: 18,
                tags: ['origami', 'paper', 'mobile', 'japanese'],
                createdAt: new Date('2026-07-11'),
            },
        ];

        await db.collection('items').insertMany(sampleItems);
        console.log(`Seeded ${sampleItems.length} sample items successfully.`);
    } catch (err) {
        console.error('Items seeding error:', (err as Error).message);
    }
}

dbConnectionPromise = connectDB();

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

module.exports = app;
export default app;
