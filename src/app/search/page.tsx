"use client";

import { useState, useEffect } from "react";
import MovieCard from "@/components/MovieCard";
import { Search } from "lucide-react";
import { TMDBMovie } from "@/lib/tmdb";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [movies, setMovies] = useState<TMDBMovie[]>([]);
    const [loading, setLoading] = useState(false);

    // State for proposals: Map tmdbId -> proposalId
    const [proposalsMap, setProposalsMap] = useState<Map<number, string>>(new Map());
    const [togglingId, setTogglingId] = useState<number | null>(null);

    // Fetch existing proposals
    useEffect(() => {
        const fetchProposals = async () => {
            try {
                const res = await fetch("/api/proposals");
                if (res.ok) {
                    const data = await res.json();
                    const newMap = new Map<number, string>();
                    // Data shape: [{ id: "...", film: { tmdbId: 123 } }]
                    data.forEach((p: any) => newMap.set(p.film.tmdbId, p.id));
                    setProposalsMap(newMap);
                }
            } catch (error) {
                console.error("Failed to fetch proposals", error);
            }
        };
        fetchProposals();
    }, []);

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

    const handleToggle = async (movie: TMDBMovie) => {
        if (togglingId === movie.id) return;
        setTogglingId(movie.id);

        const existingProposalId = proposalsMap.get(movie.id);

        try {
            if (existingProposalId) {
                // Remove
                const res = await fetch(`/api/proposals/${existingProposalId}`, { method: "DELETE" });
                if (!res.ok) throw new Error("Failed to remove");

                setProposalsMap(prev => {
                    const next = new Map(prev);
                    next.delete(movie.id);
                    return next;
                });
            } else {
                // Add
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
                const data = await res.json();

                setProposalsMap(prev => {
                    const next = new Map(prev);
                    next.set(movie.id, data.id);
                    return next;
                });
            }
        } catch (error) {
            console.error("Toggle failed", error);
            alert("Action failed. Please try again.");
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                <div style={{ position: 'relative', flexGrow: 1 }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <input
                        type="text"
                        placeholder="Buscar una película..."
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

            {loading && <p style={{ textAlign: 'center', opacity: 0.5 }}>Cargando...</p>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
                {movies.map((movie) => (
                    <MovieCard
                        key={movie.id}
                        movie={movie}
                        onAdd={handleToggle}
                        loading={togglingId === movie.id}
                        isProposed={proposalsMap.has(movie.id)}
                    />
                ))}
            </div>

            {!loading && movies.length === 0 && (
                <p style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem' }}>No se encontraron películas.</p>
            )}
        </div>
    );
}
