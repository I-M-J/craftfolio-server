/**
 * Craftfolio User Seeder
 * ----------------------
 * Directly inserts better-auth compatible documents into MongoDB.
 * Run with:  npm run seed
 *
 * Documents created per user:
 *   - `user` collection   — better-auth user record (used for login)
 *   - `account` collection — better-auth credential record (holds bcrypt password hash)
 *   - `users` collection   — server API profile record (used by /users routes)
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// ──────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌  MONGODB_URI is not set in .env');
    process.exit(1);
}

const BCRYPT_ROUNDS = 10; // must match oslo/password default used by better-auth

// Generates a nanoid-compatible 21-char URL-safe ID
function generateId(): string {
    return randomBytes(16).toString('base64url').substring(0, 21);
}

// ──────────────────────────────────────────────────────────────
// Users to seed
// ──────────────────────────────────────────────────────────────
const USERS_TO_SEED = [
    {
        name:     'Craftfolio Admin',
        email:    process.env.ADMIN_EMAIL    || 'admin@craftfolio.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@1234',
        role:     'admin',
    },
    {
        name:     'Demo Seller',
        email:    'demo@craftfolio.com',
        password: 'Demo@1234',
        role:     'user',
    },
    {
        name:     'Maya Chen',
        email:    'maya@craftfolio.com',
        password: 'Seller@1234',
        role:     'user',
    },
    {
        name:     'Layla Osman',
        email:    'layla@craftfolio.com',
        password: 'Seller@1234',
        role:     'user',
    },
    {
        name:     'James Kowalski',
        email:    'james@craftfolio.com',
        password: 'Seller@1234',
        role:     'user',
    },
];

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────
async function main() {
    const mongoClient = new MongoClient(MONGODB_URI!);

    try {
        await mongoClient.connect();
        console.log('✅  Connected to MongoDB\n');

        const db          = mongoClient.db('craftfolio_db');
        const userCol     = db.collection('user');      // better-auth (singular)
        const accountCol  = db.collection('account');   // better-auth credentials
        const usersCol    = db.collection('users');     // server API (plural)

        for (const u of USERS_TO_SEED) {
            // ── Check if already exists ───────────────────────
            const existing = await userCol.findOne({ email: u.email });

            if (existing) {
                // Ensure admin role is always correct, skip re-hashing
                if (u.role === 'admin') {
                    await userCol.updateOne(
                        { email: u.email },
                        { $set: { role: 'admin', updatedAt: new Date() } }
                    );
                    console.log(`🔄  Updated role → admin  : ${u.email}`);
                } else {
                    console.log(`⏭️   Already exists, skip  : ${u.email}`);
                }

                // Keep server `users` collection in sync
                await usersCol.updateOne(
                    { email: u.email },
                    { $set: { name: u.name, role: u.role } }
                );
                continue;
            }

            // ── Hash password (bcrypt, cost 10) ───────────────
            const hashedPassword = await bcrypt.hash(u.password, BCRYPT_ROUNDS);

            const userId    = generateId();
            const accountId = generateId();
            const now       = new Date();

            // ── Insert better-auth `user` document ────────────
            // _id IS the user id (how @better-auth/mongo-adapter maps it)
            await userCol.insertOne({
                _id:           userId as unknown as any,
                name:          u.name,
                email:         u.email,
                emailVerified: true,
                image:         null,
                role:          u.role,
                createdAt:     now,
                updatedAt:     now,
            });

            // ── Insert better-auth `account` document ─────────
            // providerId "credential" + password hash = email/password login
            await accountCol.insertOne({
                _id:         accountId as unknown as any,
                userId:      userId,
                accountId:   u.email,   // better-auth uses email as accountId for credentials
                providerId:  'credential',
                password:    hashedPassword,
                createdAt:   now,
                updatedAt:   now,
            });

            // ── Insert server API `users` (plural) record ─────
            await usersCol.updateOne(
                { email: u.email },
                {
                    $set: {
                        name:      u.name,
                        email:     u.email,
                        role:      u.role,
                        createdAt: now,
                    },
                },
                { upsert: true }
            );

            console.log(`✅  Seeded: ${u.email.padEnd(30)} role: ${u.role}`);
        }

        console.log('\n🎉  Seeding complete!');
        console.log('\nCredentials:');
        console.log('  admin@craftfolio.com  →  Admin@1234   (role: admin)');
        console.log('  demo@craftfolio.com   →  Demo@1234    (role: user)');
        console.log('  maya@craftfolio.com   →  Seller@1234  (role: user)');
        console.log('  layla@craftfolio.com  →  Seller@1234  (role: user)');
        console.log('  james@craftfolio.com  →  Seller@1234  (role: user)');

    } catch (err) {
        console.error('\n❌  Seeding failed:', err);
        process.exit(1);
    } finally {
        await mongoClient.close();
    }
}

main();
