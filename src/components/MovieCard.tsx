import Image from "next/image";
import { Link as LinkIcon, Plus, Heart } from "lucide-react";
import styles from "./MovieCard.module.css";
import { TMDBMovie } from "@/lib/tmdb";

interface MovieCardProps {
    movie: TMDBMovie;
    onAdd?: (movie: TMDBMovie) => void;
}

export default function MovieCard({ movie, onAdd }: MovieCardProps) {
    const imageUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : "https://via.placeholder.com/500x750?text=No+Image";

    return (
        <div className={styles.card}>
            <div className={styles.imageContainer}>
                <Image
                    src={imageUrl}
                    alt={movie.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className={styles.image}
                />
                <div className={styles.overlay}>
                    <p className={styles.overview}>{movie.overview.slice(0, 150)}...</p>
                    <div className={styles.actions}>
                        <button className="btn btn-primary" onClick={() => onAdd?.(movie)}>
                            <Plus size={16} style={{ marginRight: 4 }} /> Add
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
