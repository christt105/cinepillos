const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface TMDBMovie {
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    release_date: string;
    vote_average: number;
}

export interface TMDBResponse<T> {
    results: T[];
    page: number;
    total_pages: number;
}

export interface TMDBMultiResult {
    id: number;
    media_type: "movie" | "tv" | "person";
    title?: string;
    name?: string;
    poster_path: string | null;
    release_date?: string;
    first_air_date?: string;
}

export interface TMDBImage {
    file_path: string;
    iso_639_1: string | null;
}

export interface TMDBImages {
    posters: TMDBImage[];
}

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!TMDB_API_KEY) {
        console.warn("TMDB_API_KEY is missing");
        // Return empty mock to prevent crash
        return { results: [] } as unknown as T;
    }

    const query = new URLSearchParams({
        api_key: TMDB_API_KEY,
        language: 'es-ES',
        ...params,
    });

    const res = await fetch(`${TMDB_BASE_URL}${endpoint}?${query}`);

    if (!res.ok) {
        throw new Error(`TMDB Error: ${res.statusText}`);
    }

    return res.json();
}

export const tmdb = {
    searchMovies: async (query: string) => {
        return fetchTMDB<TMDBResponse<TMDBMovie>>('/search/movie', { query });
    },
    getTrending: async () => {
        return fetchTMDB<TMDBResponse<TMDBMovie>>('/trending/movie/week');
    },
    getMovieDetails: async (id: number) => {
        return fetchTMDB<TMDBMovie>(`/movie/${id}`);
    },
    /** Movies and TV shows only — `include_adult` stays off by default, but `search/multi` still mixes in people. */
    searchMulti: async (query: string) => {
        const data = await fetchTMDB<TMDBResponse<TMDBMultiResult>>('/search/multi', { query });
        return { ...data, results: data.results.filter(r => r.media_type === "movie" || r.media_type === "tv") };
    },
    /** `include_image_language=null` asks for the textless posters — no localized title art. */
    getImages: async (mediaType: "movie" | "tv", id: number) => {
        return fetchTMDB<TMDBImages>(`/${mediaType}/${id}/images`, { include_image_language: "null" });
    },
};
