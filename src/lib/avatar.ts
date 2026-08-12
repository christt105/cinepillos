const DEFAULT_AVATAR_PATH = "/default-avatar.svg";
const TVDB_IMAGE_HOST = "artworks.thetvdb.com";

/**
 * `image` is either a TMDB image path (e.g. "/abc123.jpg", a poster) or a
 * full TVDB image URL (a character photo), both validated server-side
 * against their own API before being stored — see `/api/users/[id]/avatar`
 * — never a URL a client supplied directly.
 */
export function avatarUrl(user: { image: string | null }): string {
    if (!user.image) return DEFAULT_AVATAR_PATH;

    // TMDB paths always start with "/".
    if (user.image.startsWith("/")) return `https://image.tmdb.org/t/p/w200${user.image}`;

    // Anything else should be a TVDB character URL; a bare hostname check is
    // enough since the value only ever came from our own server-side lookup.
    try {
        if (new URL(user.image).hostname === TVDB_IMAGE_HOST) return user.image;
    } catch {
        // Not a URL — a leftover Google photo/Gravatar reference from before
        // this, and no longer resolvable.
    }
    return DEFAULT_AVATAR_PATH;
}
