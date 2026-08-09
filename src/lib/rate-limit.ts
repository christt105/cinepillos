type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window limiter, best-effort only: buckets live in the memory of a
 * single serverless instance, so a caller who lands on a different warm
 * instance gets a fresh window. The real backstop against abuse is a hard,
 * database-checked cap (see the group and invitation limits); this just
 * blunts a single instance being hammered.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (bucket.count >= limit) return false;

    bucket.count += 1;
    return true;
}
