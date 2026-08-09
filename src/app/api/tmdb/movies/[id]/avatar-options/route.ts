import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tmdb } from "@/lib/tmdb";

const MAX_OPTIONS = 12;

/** The textless posters and cast photos of a movie, offered as avatar choices. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const tmdbId = Number(id);
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }

    const [images, credits] = await Promise.all([
        tmdb.getMovieImages(tmdbId),
        tmdb.getMovieCredits(tmdbId),
    ]);

    const posters = images.posters
        .filter(p => p.iso_639_1 === null)
        .slice(0, MAX_OPTIONS)
        .map(p => p.file_path);

    const cast = credits.cast
        .filter(c => c.profile_path)
        .slice(0, MAX_OPTIONS)
        .map(c => ({ id: c.id, name: c.name, profilePath: c.profile_path as string }));

    return NextResponse.json({ posters, cast });
}
