"use client";

import { useState, useEffect } from "react";
import MovieCard from "@/components/MovieCard";
import { Search } from "lucide-react";
import { TMDBMovie } from "@/lib/tmdb";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [movies, setMovies] = useState<TMDBMovie[]>([]);
    const [loading, setLoading] = useState(false);

    // Simple debounce effect
    const [proposedIds, setProposedIds] = useState<number[]>([]);
    const [addingId, setAddingId] = useState<number | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMovies(query);
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    async function fetchMovies(searchQuery: string) {
        setLoading(true);
        try {
            // If empty, it fetches trending from API route logic
            const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            setMovies(data.results || []);
        } catch (error) {
            console.error("Failed to fetch movies", error);
        } finally {
            setLoading(false);
        }
    }

    const handleAdd = async (movie: TMDBMovie) => {
        if (proposedIds.includes(movie.id)) return;

        setAddingId(movie.id);
        try {
            const res = await fetch("/api/proposals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tmdbId: movie.id,
                    title: movie.title,
                    overview: movie.overview,
                    posterPath: movie.poster_path,
                    releaseDate: movie.release_date
                })
            });

            if (!res.ok) throw new Error("Failed to propose");

            setProposedIds(prev => [...prev, movie.id]);
            alert(`Proposed: ${movie.title}`);
        } catch (error) {
            console.error("Failed to propose", error);
            alert("Failed to propose movie. Please try again.");
        } finally {
            setAddingId(null);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                <div style={{ position: 'relative', flexGrow: 1 }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input
                        type="text"
                        placeholder="Search for a movie..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '1rem 1rem 1rem 3rem',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--border)',
                            background: 'hsl(var(--input))',
                            color: 'hsl(var(--foreground))',
                            fontSize: '1rem',
                            outline: 'none'
                        }}
                    />
                </div>
            </div>

            {loading && <p style={{ textAlign: 'center', opacity: 0.5 }}>Loading...</p>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
                {movies.map((movie) => (
                    <MovieCard
                        key={movie.id}
                        movie={movie}
                        onAdd={handleAdd}
                        loading={addingId === movie.id}
                        disabled={proposedIds.includes(movie.id)}
                    />
                ))}
            </div>

            {!loading && movies.length === 0 && (
                <p style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem' }}>No movies found.</p>
            )}
        </div>
    );
}
