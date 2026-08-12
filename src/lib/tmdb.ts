import { DEFAULT_LOCALE, LOCALE_TAGS, type Locale } from "@/i18n/config";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/** Titles and overviews come back in the language the reader picked. */
const language = (locale: Locale = DEFAULT_LOCALE) => ({ language: LOCALE_TAGS[locale] });

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

export interface TMDBGenre {
    id: number;
    name: string;
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
    searchMovies: async (query: string, locale?: Locale) => {
        return fetchTMDB<TMDBResponse<TMDBMovie>>('/search/movie', { query, ...language(locale) });
    },
    getTrending: async (locale?: Locale) => {
        return fetchTMDB<TMDBResponse<TMDBMovie>>('/trending/movie/week', language(locale));
    },
    getMovieDetails: async (id: number, locale?: Locale) => {
        return fetchTMDB<TMDBMovie>(`/movie/${id}`, language(locale));
    },
    /** Movies and TV shows only — `include_adult` stays off by default, but `search/multi` still mixes in people. */
    searchMulti: async (query: string, locale?: Locale) => {
        const data = await fetchTMDB<TMDBResponse<TMDBMultiResult>>('/search/multi', { query, ...language(locale) });
        return { ...data, results: data.results.filter(r => r.media_type === "movie" || r.media_type === "tv") };
    },
    /** `include_image_language=null` asks for the textless posters — no localized title art. */
    getImages: async (mediaType: "movie" | "tv", id: number) => {
        return fetchTMDB<TMDBImages>(`/${mediaType}/${id}/images`, { include_image_language: "null" });
    },
    getGenres: async (locale?: Locale) => {
        return fetchTMDB<{ genres: TMDBGenre[] }>('/genre/movie/list', language(locale));
    },
    /** Browse by genre, most popular first — for when there's nothing specific to search for. */
    discoverMovies: async (genreId: number, locale?: Locale) => {
        return fetchTMDB<TMDBResponse<TMDBMovie>>('/discover/movie', {
            with_genres: String(genreId),
            sort_by: 'popularity.desc',
            ...language(locale),
        });
    },
    getSimilarMovies: async (id: number, locale?: Locale) => {
        return fetchTMDB<TMDBResponse<TMDBMovie>>(`/movie/${id}/similar`, language(locale));
    },
};
