import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Vercel functions reuse warm containers, so keep a single client on the
// global object instead of opening one per invocation. DATABASE_URL is
// Neon's pooled (PgBouncer) connection string; migrations use the direct one.
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
