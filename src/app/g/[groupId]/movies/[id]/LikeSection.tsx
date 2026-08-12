"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { avatarUrl } from "@/lib/avatar";
import { useLikeToggle, type Liker } from "@/lib/useLikeToggle";
import likeButtonStyles from "@/components/ProposalLikeButton.module.css";
import styles from "./movie.module.css";

interface LikeSectionProps {
    groupId: string;
    proposalId: string;
    initialLikers: Liker[];
    currentUser: Liker;
}

/** The film's own page shows every liker by name, not just a stacked preview, so the toggle and the list share one piece of state instead of drifting apart. */
export default function LikeSection({ groupId, proposalId, initialLikers, currentUser }: LikeSectionProps) {
    const t = useTranslations("likes");
    const tMovie = useTranslations("movie");
    const tCommon = useTranslations("common");
    const { likers, liked, toggle } = useLikeToggle(groupId, proposalId, initialLikers, currentUser);

    return (
        <div className={styles.proposers}>
            <div className={styles.likersHeader}>
                <h3 className={styles.proposersTitle}>{tMovie("likedByTitle")}</h3>
                <button
                    type="button"
                    className={clsx("btn btn-ghost", likeButtonStyles.button, liked && likeButtonStyles.liked)}
                    onClick={() => toggle()}
                    aria-pressed={liked}
                    aria-label={liked ? t("unlike") : t("like")}
                >
                    <Heart size={16} className={clsx(likeButtonStyles.icon, liked && likeButtonStyles.iconLiked)} />
                    <span>{likers.length}</span>
                </button>
            </div>
            {likers.length > 0 && (
                <div className={styles.proposersList}>
                    {likers.map(user => (
                        <div key={user.id} className={styles.proposer}>
                            <div className={`avatar ${styles.proposerAvatar}`}>
                                <Image
                                    src={avatarUrl(user)}
                                    alt={user.name || tCommon("unknownUser")}
                                    fill
                                    className={styles.posterImage}
                                />
                            </div>
                            <span>{user.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
