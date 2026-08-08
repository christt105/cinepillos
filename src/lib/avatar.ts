import { createHash } from "node:crypto";

/** SHA-256 of the trimmed, lowercased email, as Gravatar's API requires. */
function gravatarHash(email: string): string {
    return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/** `d=identicon` draws a deterministic pattern instead of a broken image for anyone without a Gravatar account. */
export function gravatarUrl(email: string, size = 128): string {
    return `https://gravatar.com/avatar/${gravatarHash(email)}?d=identicon&s=${size}`;
}

/** Google's photo first, Gravatar as the fallback so an avatar is never empty. */
export function avatarUrl(user: { image?: string | null; email: string }, size = 128): string {
    return user.image || gravatarUrl(user.email, size);
}
