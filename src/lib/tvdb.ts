const TVDB_API_KEY = process.env.TVDB_API_KEY;
const TVDB_BASE_URL = "https://api4.thetvdb.com/v4";

export interface TVDBCharacter {
    id: number;
    name: string;
    image: string;
    peopleType: string;
}

export interface TVDBRemoteMatch {
    type: "movie" | "series";
    id: number;
}

/** TVDB login tokens are valid for about a month; refresh well before that. */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
    if (!TVDB_API_KEY) {
        console.warn("TVDB_API_KEY is missing");
        return null;
    }
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.value;
    }

    const res = await fetch(`${TVDB_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: TVDB_API_KEY }),
    });
    if (!res.ok) {
        throw new Error(`TVDB login error: ${res.statusText}`);
    }
    const body = await res.json();
    cachedToken = { value: body.data.token as string, expiresAt: Date.now() + TOKEN_TTL_MS };
    return cachedToken.value;
}

async function fetchTVDB<T>(endpoint: string): Promise<T | null> {
    const token = await getToken();
    if (!token) return null;

    const res = await fetch(`${TVDB_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
        throw new Error(`TVDB Error: ${res.statusText}`);
    }
    const body = await res.json();
    return (body.data as T | null) ?? null;
}

export const tvdb = {
    /** Maps a TMDB movie/series id to its TVDB counterpart, if TVDB has one. */
    findRemoteId: async (tmdbId: number, mediaType: "movie" | "tv"): Promise<TVDBRemoteMatch | null> => {
        const matches = await fetchTVDB<Array<{ movie?: { id: number }; series?: { id: number } }>>(
            `/search/remoteid/${tmdbId}`
        );
        if (!matches) return null;

        if (mediaType === "movie") {
            const match = matches.find(m => m.movie);
            return match?.movie ? { type: "movie", id: match.movie.id } : null;
        }

        const match = matches.find(m => m.series);
        return match?.series ? { type: "series", id: match.series.id } : null;
    },

    getCharacters: async (match: TVDBRemoteMatch): Promise<TVDBCharacter[]> => {
        const path = match.type === "movie" ? `/movies/${match.id}/extended` : `/series/${match.id}/extended`;
        const data = await fetchTVDB<{ characters?: TVDBCharacter[] }>(path);
        return data?.characters ?? [];
    },
};
