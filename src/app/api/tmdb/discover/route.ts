import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tmdb } from "@/lib/tmdb";
import { localeFromCookieHeader } from "@/i18n/config";

/** Browses films by genre, for discovery when there's nothing specific to search for. */
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const genreId = Number(searchParams.get("genre"));
    if (!Number.isInteger(genreId) || genreId <= 0) {
        return NextResponse.json({ error: "invalid_genre" }, { status: 400 });
    }

    const locale = localeFromCookieHeader(request.headers.get("cookie"));
    const results = await tmdb.discoverMovies(genreId, locale);

    return NextResponse.json(results);
}
