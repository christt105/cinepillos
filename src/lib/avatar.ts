const DEFAULT_AVATAR_PATH = "/default-avatar.svg";

/**
 * `image` is only ever a TMDB image path (e.g. "/abc123.jpg"), validated
 * server-side against TMDB's own data before it's stored — see
 * `/api/users/[id]/avatar` — never a URL a client supplied directly.
 */
export function avatarUrl(user: { image: string | null }): string {
    // TMDB paths always start with "/"; anything else is a leftover Google
    // photo URL or Gravatar URL from before this, and no longer resolvable.
    if (!user.image || !user.image.startsWith("/")) return DEFAULT_AVATAR_PATH;
    return `https://image.tmdb.org/t/p/w200${user.image}`;
}
