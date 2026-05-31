import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const users = await p.user.findMany({ select: { id: true, fullName: true, phone: true, role: true, tier: true, isActive: true } });
console.log(JSON.stringify(users, null, 2));
await p.$disconnect();

