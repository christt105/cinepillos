"use client";

import { useEffect, useState } from "react";
import { TMDBMovie } from "@/lib/tmdb";

interface Proposal {
    id: string;
    film: { tmdbId: number };
}

/** Proposes or removes a film for the group, tracking each film's proposal id so the toggle knows which state it's in. */
export function useProposalToggle(groupId: string) {
    const [proposalsMap, setProposalsMap] = useState<Map<number, string>>(new Map());
    const [togglingId, setTogglingId] = useState<number | null>(null);

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

    const toggle = async (movie: TMDBMovie, onError?: () => void) => {
        if (togglingId === movie.id) return;
        setTogglingId(movie.id);

        const existingProposalId = proposalsMap.get(movie.id);

        try {
            if (existingProposalId) {
                const res = await fetch(`/api/groups/${groupId}/proposals/${existingProposalId}`, { method: "DELETE" });
                if (!res.ok) throw new Error("Failed to remove");

                setProposalsMap(prev => {
                    const next = new Map(prev);
                    next.delete(movie.id);
                    return next;
                });
            } else {
                const res = await fetch(`/api/groups/${groupId}/proposals`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        tmdbId: movie.id,
                        title: movie.title,
                        overview: movie.overview,
                        posterPath: movie.poster_path,
                        releaseDate: movie.release_date,
                    }),
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
            onError?.();
        } finally {
            setTogglingId(null);
        }
    };

    return { proposalsMap, togglingId, toggle };
}
