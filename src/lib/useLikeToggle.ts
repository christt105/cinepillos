"use client";

import { useState } from "react";

export interface Liker {
    id: string;
    name: string | null;
    image: string | null;
}

/**
 * Toggles a like on a proposal, keeping the full list of likers (not just a
 * count) in sync — optimistic, rolls back if the request fails.
 */
export function useLikeToggle(groupId: string, proposalId: string, initialLikers: Liker[], currentUser: Liker) {
    const [likers, setLikers] = useState(initialLikers);
    const [pending, setPending] = useState(false);
    const liked = likers.some(liker => liker.id === currentUser.id);

    const toggle = async () => {
        if (pending) return;
        const next = !liked;
        setPending(true);
        setLikers(current =>
            next
                ? [...current, currentUser]
                : current.filter(liker => liker.id !== currentUser.id)
        );

        try {
            const res = await fetch(`/api/groups/${groupId}/proposals/${proposalId}/like`, {
                method: next ? "POST" : "DELETE",
            });

            if (!res.ok) throw new Error("Failed to toggle like");
        } catch (error) {
            console.error("Toggle like failed", error);
            setLikers(current =>
                next
                    ? current.filter(liker => liker.id !== currentUser.id)
                    : [...current, currentUser]
            );
        } finally {
            setPending(false);
        }
    };

    return { likers, liked, pending, toggle };
}
