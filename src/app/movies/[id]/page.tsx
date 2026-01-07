import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tmdb } from "@/lib/tmdb";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Link as LinkIcon } from "lucide-react";
import { ProposalButton } from "./ProposalButton";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function MovieDetailsPage(props: PageProps) {
    const params = await props.params;
    const { id } = params;

    const session = await getServerSession(authOptions);
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
                include: { user: true }
            }
        }
    });

    const existingProposalId = dbFilm?.proposals?.find(p => p.userId === session?.user?.id)?.id || null;
    const allProposals = dbFilm?.proposals || [];

    return (
        <div style={{ paddingBottom: '4rem' }}>
            <Link href="/" className="btn btn-ghost" style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center' }}>
                <ArrowLeft size={16} style={{ marginRight: 8 }} /> Back to Home
            </Link>

            <div className="glass-card" style={{ padding: '2rem', display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '0 0 300px', maxWidth: '100%', position: 'relative', aspectRatio: '2/3', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    {movie.poster_path ? (
                        <Image
                            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                            alt={movie.title}
                            fill
                            style={{ objectFit: 'cover' }}
                        />
                    ) : (
                        <div style={{ width: '100%', height: '100%', background: '#333' }} />
                    )}
                </div>

                <div style={{ flex: 1, minWidth: '300px' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{movie.title}</h1>
                    <div style={{ display: 'flex', gap: '1rem', opacity: 0.7, marginBottom: '2rem' }}>
                        <span>{new Date(movie.release_date).getFullYear()}</span>
                        <span>⭐ {movie.vote_average.toFixed(1)}</span>
                    </div>

                    <p style={{ lineHeight: 1.6, marginBottom: '2rem', fontSize: '1.1rem', opacity: 0.9 }}>
                        {movie.overview}
                    </p>

                    {session ? (
                        <div style={{ marginBottom: '2rem' }}>
                            <form action="/api/proposals/actions" method="POST">
                                <ProposalButton
                                    tmdbId={movie.id}
                                    title={movie.title}
                                    overview={movie.overview}
                                    posterPath={movie.poster_path}
                                    releaseDate={movie.release_date}
                                    initialProposalId={existingProposalId}
                                />
                            </form>
                        </div>
                    ) : (
                        <p style={{ marginBottom: '2rem', opacity: 0.7 }}>Sign in to propose movies.</p>
                    )}

                    <div style={{ marginBottom: '2rem' }}>
                        <a
                            href={`https://www.themoviedb.org/movie/${movie.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)' }}
                        >
                            <LinkIcon size={16} /> View on TMDB
                        </a>
                    </div>

                    {allProposals.length > 0 && (
                        <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600 }}>Proposed by:</h3>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {allProposals.map(p => (
                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', position: 'relative', background: '#333' }}>
                                            {p.user.image && (
                                                <Image
                                                    src={p.user.image}
                                                    alt={p.user.name || "User"}
                                                    fill
                                                    style={{ objectFit: 'cover' }}
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
