import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;')
  .catch((error) => console.error('Failed to enable WAL journal mode', error))
