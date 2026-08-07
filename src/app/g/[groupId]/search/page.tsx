"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import MovieCard from "@/components/MovieCard";
import { Search } from "lucide-react";
import { TMDBMovie } from "@/lib/tmdb";
import styles from "./search.module.css";

interface Proposal {
    id: string;
    film: { tmdbId: number };
}

export default function SearchPage() {
    const { groupId } = useParams<{ groupId: string }>();
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
                const res = await fetch(`/api/groups/${groupId}/proposals`);
                if (res.ok) {
                    const data = await res.json();
                    const newMap = new Map<number, string>();
                    (data as Proposal[]).forEach(proposal => newMap.set(proposal.film.tmdbId, proposal.id));
                    setProposalsMap(newMap);
                }
            } catch (error) {
                console.error("Failed to fetch proposals", error);
            }
        };
        fetchProposals();
    }, [groupId]);

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
                const res = await fetch(`/api/groups/${groupId}/proposals/${existingProposalId}`, { method: "DELETE" });
                if (!res.ok) throw new Error("Failed to remove");

                setProposalsMap(prev => {
                    const next = new Map(prev);
                    next.delete(movie.id);
                    return next;
                });
            } else {
                // Add
                const res = await fetch(`/api/groups/${groupId}/proposals`, {
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
        <div className="page">
            <div className={styles.searchBar}>
                <div className={styles.searchField}>
                    <Search className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Buscar una película..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className={`input ${styles.searchInput}`}
                    />
                </div>
            </div>

            {loading && <p className={styles.status}>Cargando...</p>}

            <div className={styles.results}>
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
                <p className={styles.emptyStatus}>No se encontraron películas.</p>
            )}
        </div>
    );
}
