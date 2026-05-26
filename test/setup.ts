// // test/setup.ts
// import { PrismaPg } from '@prisma/adapter-pg';
// import { PrismaClient } from '../generated/prisma/client.js';

// const prisma = new PrismaClient({
//   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
// });

// beforeAll(async () => {
//   // Ensure test database is clean
//   await prisma.$connect();
// });

// afterAll(async () => {
//   await prisma.$disconnect();
// });