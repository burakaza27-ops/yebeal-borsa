const { PrismaClient } = require('@prisma/client');
try {
  const prisma = new PrismaClient({ datasources: { db: { url: '' } } });
  console.log('Prisma instantiated successfully');
} catch (e) {
  console.error('Prisma instantiation failed:', e);
}
