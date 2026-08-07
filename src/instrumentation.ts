export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureWalMode } = await import('@/lib/prisma')
    await ensureWalMode()
  }
}
