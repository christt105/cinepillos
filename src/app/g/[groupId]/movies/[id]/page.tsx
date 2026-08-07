import { prisma } from "@/lib/prisma";
import { requireGroupPage } from "@/lib/group-page";
import { tmdb } from "@/lib/tmdb";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Link as LinkIcon } from "lucide-react";
import { ProposalButton } from "./ProposalButton";
import styles from "./movie.module.css";

interface PageProps {
    params: Promise<{ groupId: string; id: string }>;
}

export default async function MovieDetailsPage(props: PageProps) {
    const params = await props.params;
    const { groupId, id } = params;

    const { session } = await requireGroupPage(groupId);
    const tmdbId = Number(id);

    if (isNaN(tmdbId)) {
        notFound();
    }

    // Parallel fetch: TMDB details and Local Proposal
    // Note: We need to handle cases where 3rd party API fails gracefully if possible, or just let error boundary catch it.
    let movie;
    try {
        movie = await tmdb.getMovieDetails(tmdbId);
    } catch (e) {
        console.error("Failed to fetch TMDB movie", e);
        // Fallback or notFound
    }

    if (!movie) {
        notFound();
    }

    // Check if proposal exists for this user and this film (by TMDB ID)
    // First, find the film record in DB if it exists
    const dbFilm = await prisma.film.findUnique({
        where: { tmdbId },
        include: {
            proposals: {
                where: { groupId },
                include: { user: true }
            }
        }
    });

    const existingProposalId = dbFilm?.proposals?.find(p => p.userId === session.user.id)?.id || null;
    const allProposals = dbFilm?.proposals || [];

    return (
        <div className="page">
            <Link href={`/g/${groupId}`} className={`btn btn-ghost ${styles.back}`}>
                <ArrowLeft size={16} /> Volver al Inicio
            </Link>

            <div className={`glass-card ${styles.card}`}>
                <div className={styles.poster}>
                    {movie.poster_path ? (
                        <Image
                            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                            alt={movie.title}
                            fill
                            className={styles.posterImage}
                        />
                    ) : (
                        <div className="poster-placeholder">Sin poster</div>
                    )}
                </div>

                <div className={styles.details}>
                    <h1 className={styles.title}>{movie.title}</h1>
                    <div className={styles.meta}>
                        <span>{new Date(movie.release_date).getFullYear()}</span>
                        <span>⭐ {movie.vote_average.toFixed(1)}</span>
                    </div>

                    <p className={styles.overview}>
                        {movie.overview}
                    </p>

                    <div className={styles.block}>
                        <ProposalButton
                            tmdbId={movie.id}
                            title={movie.title}
                            overview={movie.overview}
                            posterPath={movie.poster_path}
                            releaseDate={movie.release_date}
                            initialProposalId={existingProposalId}
                        />
                    </div>

                    <div className={styles.block}>
                        <a
                            href={`https://www.themoviedb.org/movie/${movie.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost"
                        >
                            <LinkIcon size={16} /> Ver en TMDB
                        </a>
                    </div>

                    {allProposals.length > 0 && (
                        <div className={styles.proposers}>
                            <h3 className={styles.proposersTitle}>Propuesta por:</h3>
                            <div className={styles.proposersList}>
                                {allProposals.map(p => (
                                    <div key={p.id} className={styles.proposer}>
                                        <div className={`avatar ${styles.proposerAvatar}`}>
                                            {p.user.image && (
                                                <Image
                                                    src={p.user.image}
                                                    alt={p.user.name || "User"}
                                                    fill
                                                    className={styles.posterImage}
                                                    unoptimized
                                                />
                                            )}
                                        </div>
                                        <span>{p.user.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
