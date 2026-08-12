import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tmdb } from "@/lib/tmdb";
import { localeFromCookieHeader } from "@/i18n/config";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const tmdbId = Number(id);
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }

    const locale = localeFromCookieHeader(request.headers.get("cookie"));
    const results = await tmdb.getSimilarMovies(tmdbId, locale);

    return NextResponse.json(results);
}
