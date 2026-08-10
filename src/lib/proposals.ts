type LikedProposal = { _count: { likes: number } };

type ProposedFilm = { proposals: LikedProposal[] };

/** Likes a film has gathered across every proposal of it in the group. */
export function filmLikeCount(film: ProposedFilm): number {
    return film.proposals.reduce((total, proposal) => total + proposal._count.likes, 0);
}

/**
 * Most liked first. The sort is stable, so films with the same number of likes
 * keep the order the query gave them (newest first).
 */
export function sortByLikes<T extends ProposedFilm>(films: T[]): T[] {
    return [...films].sort((a, b) => filmLikeCount(b) - filmLikeCount(a));
}
