"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import styles from "./ProposalLikeButton.module.css";

interface ProposalLikeButtonProps {
    groupId: string;
    proposalId: string;
    initialCount: number;
    initialLiked: boolean;
    className?: string;
}

/**
 * Toggles a like on a proposal. Likes are group-wide support for a film and
 * never touch `Vote`, which only exists inside a meeting.
 */
export default function ProposalLikeButton({
    groupId,
    proposalId,
    initialCount,
    initialLiked,
    className,
}: ProposalLikeButtonProps) {
    const t = useTranslations("likes");
    const [liked, setLiked] = useState(initialLiked);
    const [count, setCount] = useState(initialCount);
    const [pending, setPending] = useState(false);

    const toggle = async (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (pending) return;

        const next = !liked;
        setPending(true);
        setLiked(next);
        setCount(current => current + (next ? 1 : -1));

        try {
            const res = await fetch(`/api/groups/${groupId}/proposals/${proposalId}/like`, {
                method: next ? "POST" : "DELETE",
            });

            if (!res.ok) throw new Error("Failed to toggle like");

            const data = await res.json();
            setLiked(data.liked);
            setCount(data.count);
        } catch (error) {
            console.error("Toggle like failed", error);
            setLiked(!next);
            setCount(current => current + (next ? -1 : 1));
        } finally {
            setPending(false);
        }
    };

    return (
        <button
            type="button"
            className={clsx("btn btn-ghost", styles.button, liked && styles.liked, className)}
            onClick={toggle}
            aria-pressed={liked}
            aria-label={liked ? t("unlike") : t("like")}
        >
            <Heart size={16} className={clsx(styles.icon, liked && styles.iconLiked)} />
            <span>{count}</span>
        </button>
    );
}
