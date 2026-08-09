import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tmdb } from "@/lib/tmdb";
import { tvdb } from "@/lib/tvdb";

const MAX_OPTIONS = 12;

/** The textless posters and TVDB character photos of a title, offered as avatar choices. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const tmdbId = Number(id);
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const mediaType = searchParams.get("mediaType") === "tv" ? "tv" : "movie";

    const [images, remote] = await Promise.all([
        tmdb.getImages(mediaType, tmdbId),
        tvdb.findRemoteId(tmdbId, mediaType),
    ]);
    const characters = remote ? await tvdb.getCharacters(remote) : [];

    const posters = images.posters
        .filter(p => p.iso_639_1 === null)
        .slice(0, MAX_OPTIONS)
        .map(p => p.file_path);

    const cast = characters
        .filter(c => c.peopleType === "Actor" && c.image)
        .slice(0, MAX_OPTIONS)
        .map(c => ({ id: c.id, name: c.name, imageUrl: c.image }));

    return NextResponse.json({ posters, cast });
}
