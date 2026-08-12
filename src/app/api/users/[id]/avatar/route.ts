import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { avatarSelectSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";
import { tmdb } from "@/lib/tmdb";
import { tvdb } from "@/lib/tvdb";

/**
 * Resolves the avatar image itself server-side instead of trusting whatever
 * the client sent: a poster path is only accepted if it's still present in a
 * fresh TMDB response for that title, and a cast photo is looked up from the
 * TVDB character's id rather than a URL at all.
 */
async function resolveAvatarPath(selection: {
    kind: "poster" | "cast";
    tmdbId: number;
    mediaType: "movie" | "tv";
    path?: string;
    characterId?: number;
}) {
    if (selection.kind === "poster") {
        const images = await tmdb.getImages(selection.mediaType, selection.tmdbId);
        const match = images.posters.find(p => p.iso_639_1 === null && p.file_path === selection.path);
        return match?.file_path ?? null;
    }

    const remote = await tvdb.findRemoteId(selection.tmdbId, selection.mediaType);
    if (!remote) return null;
    const characters = await tvdb.getCharacters(remote);
    const match = characters.find(c => c.id === selection.characterId && c.peopleType === "Actor" && c.image);
    return match?.image ?? null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (session.user.id !== id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await parseBody(request, avatarSelectSchema);
    if (!body.ok) return body.response;

    const path = await resolveAvatarPath(body.data);
    if (!path) {
        return NextResponse.json({ error: "invalid_selection" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({ where: { id }, data: { image: path } });

    return NextResponse.json(updatedUser);
}

/** Resets a user back to the bundled default avatar. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (session.user.id !== id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedUser = await prisma.user.update({ where: { id }, data: { image: null } });

    return NextResponse.json(updatedUser);
}
