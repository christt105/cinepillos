"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { avatarUrl } from "@/lib/avatar";
import styles from "./ProposalLikeButton.module.css";

export interface Liker {
    id: string;
    name: string | null;
    image: string | null;
}

interface ProposalLikeButtonProps {
    groupId: string;
    proposalId: string;
    initialLikers: Liker[];
    currentUser: Liker;
    className?: string;
}

const STACK_LIMIT = 3;

/**
 * Toggles a like on a proposal. Likes are group-wide support for a film and
 * never touch `Vote`, which only exists inside a meeting. Shows who liked it
 * as a stacked avatar list, so the club can see who's excited about a film.
 */
export default function ProposalLikeButton({
    groupId,
    proposalId,
    initialLikers,
    currentUser,
    className,
}: ProposalLikeButtonProps) {
    const t = useTranslations("likes");
    const tCommon = useTranslations("common");
    const [likers, setLikers] = useState(initialLikers);
    const [pending, setPending] = useState(false);

    const liked = likers.some(liker => liker.id === currentUser.id);

    const toggle = async (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
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

    return (
        <div className={clsx(styles.wrapper, className)}>
            {likers.length > 0 && (
                <div className={styles.stack}>
                    {likers.slice(0, STACK_LIMIT).map(liker => (
                        <div key={liker.id} className={clsx("avatar", styles.stackAvatar)} title={liker.name || tCommon("unknownUser")}>
                            <Image src={avatarUrl(liker)} alt={liker.name || tCommon("unknownUser")} fill className={styles.stackAvatarImage} />
                        </div>
                    ))}
                    {likers.length > STACK_LIMIT && (
                        <span className={styles.stackMore}>+{likers.length - STACK_LIMIT}</span>
                    )}
                </div>
            )}
            <button
                type="button"
                className={clsx("btn btn-ghost", styles.button, liked && styles.liked)}
                onClick={toggle}
                aria-pressed={liked}
                aria-label={liked ? t("unlike") : t("like")}
            >
                <Heart size={16} className={clsx(styles.icon, liked && styles.iconLiked)} />
                <span>{likers.length}</span>
            </button>
        </div>
    );
}
