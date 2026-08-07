import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { Link as LinkIcon, Plus } from "lucide-react";
import styles from "./MovieCard.module.css";
import { TMDBMovie } from "@/lib/tmdb";

interface MovieCardProps {
    movie: TMDBMovie;
    onAdd?: (movie: TMDBMovie) => void;
    loading?: boolean;
    isProposed?: boolean;
}

export default function MovieCard({ movie, onAdd, loading = false, isProposed = false }: MovieCardProps) {
    const imageUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : "https://via.placeholder.com/500x750?text=No+Image";

    const link = `/movies/${movie.id}`;

    return (
        <div className={styles.card}>
            <div className={styles.imageContainer}>
                <Link href={link}>
                    <Image
                        src={imageUrl}
                        alt={movie.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className={styles.image}
                    />
                </Link>
                <div className={styles.overlay}>
                    <p className={styles.overview}>{movie.overview.slice(0, 150)}...</p>
                    <div className={styles.actions}>
                        <button
                            className={clsx("btn", styles.toggle, isProposed ? "btn-danger" : "btn-primary")}
                            onClick={() => onAdd?.(movie)}
                            disabled={loading}
                        >
                            {loading ? (
                                <span>...</span>
                            ) : (
                                <Plus size={16} className={clsx(styles.toggleIcon, isProposed && styles.toggleIconOn)} />
                            )}
                            {isProposed ? "Quitar" : "Añadir"}
                        </button>
                        <a
                            href={`https://www.themoviedb.org/movie/${movie.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost"
                        >
                            <LinkIcon size={16} />
                        </a>
                    </div>
                </div>
            </div>
            <div className={styles.content}>
                <h3 className={styles.title}>{movie.title}</h3>
                <span className={styles.year}>
                    {movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A"}
                </span>
            </div>
        </div>
    );
}
