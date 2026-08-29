import { PrismaClient } from '@prisma/client';

// Prisma 6 – no adapter needed
const prisma = new PrismaClient();

export default prisma;