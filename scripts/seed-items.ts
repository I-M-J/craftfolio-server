/**
 * Craftfolio Items Seeder
 * -----------------------
 * Inserts 12 sample items into the `items` collection in MongoDB.
 * Run with:  npm run seed:items
 *
 * Idempotent — skips insertion if 12 items already exist.
 * Drops and re-seeds if the collection has stale data.
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌  MONGODB_URI is not set in .env');
    process.exit(1);
}

const ITEMS = [
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
        fullDescription: 'This stunning wall hanging is crafted from 100% natural cotton rope, hand-knotted in a flowing bohemian design. Measuring approximately 24 inches wide and 36 inches long, it makes a striking statement above a sofa, bed, or fireplace. Each knot is tied by hand with care and intention. The fringe is carefully combed and trimmed to create a soft, feathered finish. A wooden dowel is included for easy hanging.',
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
        fullDescription: 'Cut and stitched entirely by hand from premium full-grain vegetable-tanned leather, this slim bifold wallet develops a beautiful patina with use. Features 4 card slots, a center cash pocket, and an ID window. The saddle-stitch technique used creates a bond twice as strong as machine sewing. Measures 4.5 x 3.5 inches when closed. Natural tan color deepens over time with your own personal patina.',
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
        fullDescription: 'Poured by hand using 100% natural soy wax and pure lavender essential oil, this candle burns cleanly for up to 45 hours. The cotton wick is lead-free and pre-waxed for a consistent, even burn. Housed in a thick-walled glass jar that can be repurposed as a drinking glass or small planter once finished. Each candle is hand-labeled and contains no synthetic fragrances or additives — just real lavender.',
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
        fullDescription: 'Crafted from a single piece of Black Walnut hardwood, this end-grain cutting board is both a functional kitchen tool and a showpiece for entertaining. The end-grain surface is self-healing and gentler on blades than edge-grain boards. A carved juice groove runs the perimeter to catch liquids. Finished with food-safe mineral oil and beeswax. Dimensions: 16 x 10 x 1.5 inches. Handwashing recommended.',
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
        fullDescription: 'Forged from a solid length of sterling silver (92.5% pure) wire, each ring is hammered into shape using traditional metalsmithing tools. The hammered texture catches and diffuses light beautifully, giving it a dynamic character that a cast ring simply cannot achieve. Available in sizes 5–11. Each ring is finished with a light polish, leaving the hammer textures visible. Hypoallergenic and nickel-free.',
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
        fullDescription: 'This sturdy canvas tote features an original botanical embroidery design stitched entirely by hand using colorfast embroidery floss. The 12oz canvas body is thick enough to hold groceries or books without straining the straps. Dimensions: 15 inches wide x 16 inches tall with 10 inch cotton handles. Machine washable on gentle cycle. Each tote is a slightly unique original — the embroidery cannot be exactly replicated.',
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
        fullDescription: 'Real wildflowers are gathered, pressed for two weeks, and then carefully arranged into an original composition. Each piece is unique — no two arrangements are identical because the flowers themselves are never identical. The shadow box frame is handmade from reclaimed wood and includes UV-protective glass to prevent fading. Overall dimensions: 8 x 10 inch frame with a 5 x 7 inch floral arrangement.',
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
        fullDescription: 'Each runner is dyed using traditional Japanese shibori technique — the linen is folded, twisted, or bound before being submerged in a natural indigo dye bath. This creates the distinctive resist patterns unique to each piece. The 100% linen base fabric is pre-washed for softness and stability. Dimensions: 14 inches wide x 72 inches long. Wash cold on gentle cycle; the indigo softens naturally over time.',
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
        fullDescription: 'An eco-friendly alternative to plastic wrap, these beeswax wraps are made from organic cotton fabric coated with a blend of local beeswax, organic jojoba oil, and tree resin. The warmth of your hands softens the wrap, making it pliable enough to seal around bowls, sandwiches, and fruits. Set includes: small (7x8 in), medium (10x11 in), and large (13x14 in). Wash in cool water. Compostable at end of life.',
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
        fullDescription: 'Turned on a wood lathe from reclaimed White Oak salvaged from an old barn, each pen has a grain pattern that tells the story of decades of growth. Fitted with a premium German refill and a twist mechanism. Set of two pens, presented in a hand-stitched leather roll. Finished with multiple coats of friction polish, bringing out the natural warmth of the oak.',
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
        fullDescription: 'Inspired by the Japanese legend of the Senbazuru — fold 1000 paper cranes and a wish will be granted — this mobile features 100 carefully folded cranes in a curated palette of earth tones and blush pinks. Each crane is folded by hand from acid-free washi paper and strung on invisible silk thread, suspended from a lacquered bamboo ring. Approx 20 inches in diameter, 36 inches hanging length.',
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

async function main() {
    const mongoClient = new MongoClient(MONGODB_URI!);

    try {
        await mongoClient.connect();
        console.log('✅  Connected to MongoDB\n');

        const db       = mongoClient.db('craftfolio_db');
        const itemsCol = db.collection('items');

        const existing = await itemsCol.countDocuments();

        if (existing === ITEMS.length) {
            console.log(`⏭️   Items already seeded (${existing} documents found). Nothing to do.`);
            return;
        }

        if (existing > 0) {
            console.log(`🗑️   Found ${existing} existing item(s) — dropping and re-seeding...`);
            await itemsCol.drop();
        }

        const result = await itemsCol.insertMany(ITEMS);
        console.log(`✅  Inserted ${result.insertedCount} items into the \`items\` collection.\n`);

        console.log('Items seeded:');
        ITEMS.forEach((item, i) => {
            console.log(`  ${String(i + 1).padStart(2, ' ')}. ${item.title.padEnd(35)} — ${item.sellerName}`);
        });

    } catch (err) {
        console.error('\n❌  Seeding failed:', err);
        process.exit(1);
    } finally {
        await mongoClient.close();
    }
}

main();
