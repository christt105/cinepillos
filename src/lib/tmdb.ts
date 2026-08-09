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

export interface TMDBCastMember {
    id: number;
    name: string;
    profile_path: string | null;
}

export interface TMDBCredits {
    cast: TMDBCastMember[];
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
    getMovieCredits: async (id: number) => {
        return fetchTMDB<TMDBCredits>(`/movie/${id}/credits`);
    },
    /** `include_image_language=null` asks for the textless posters — no localized title art. */
    getMovieImages: async (id: number) => {
        return fetchTMDB<TMDBImages>(`/movie/${id}/images`, { include_image_language: "null" });
    },
};
