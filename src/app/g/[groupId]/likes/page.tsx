import { prisma } from "@/lib/prisma";
import { requireGroupPage } from "@/lib/group-page";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import styles from "./likes.module.css";

export const dynamic = "force-dynamic";

export default async function MyLikesPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;
    const t = await getTranslations("myLikes");
    const tCommon = await getTranslations("common");
    const { session } = await requireGroupPage(groupId);

    const likes = await prisma.like.findMany({
        where: { userId: session.user.id, proposal: { groupId } },
        include: { proposal: { include: { film: true } } },
        orderBy: { createdAt: "desc" },
    });

    // A film can have more than one proposal in the group, so the same film
    // could show up through two different likes — keep only the first.
    const films = [...new Map(likes.map(like => [like.proposal.film.id, like.proposal.film])).values()];

    return (
        <div className="page">
            <h1 className="page-title">{t("pageTitle")}</h1>

            {films.length > 0 ? (
                <div className="responsive-proposals">
                    {films.map(film => (
                        <Link key={film.id} href={`/g/${groupId}/movies/${film.tmdbId}`}>
                            <div className="proposal-card">
                                <div className="poster">
                                    {film.posterPath ? (
                                        <Image
                                            src={`https://image.tmdb.org/t/p/w500${film.posterPath}`}
                                            alt={film.title}
                                            fill
                                            className="poster-image"
                                        />
                                    ) : (
                                        <div className="poster-placeholder">{tCommon("noPoster")}</div>
                                    )}
                                </div>
                                <h4 className="poster-title">{film.title}</h4>
                                {film.releaseDate && (
                                    <span className={styles.posterYear}>
                                        {new Date(film.releaseDate).getFullYear()}
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className={styles.empty}>
                    <p className={styles.emptyText}>{t("empty")}</p>
                    <Link href={`/g/${groupId}/search`} className="btn btn-primary">{t("browse")}</Link>
                </div>
            )}
        </div>
    );
}
