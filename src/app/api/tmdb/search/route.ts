import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tmdb } from "@/lib/tmdb";
import { localeFromCookieHeader } from "@/i18n/config";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const locale = localeFromCookieHeader(request.headers.get("cookie"));

    if (!query) {
        const trending = await tmdb.getTrending(locale);
        return NextResponse.json(trending);
    }

    /** `media=multi` also searches TV shows — used by the avatar picker, which isn't limited to films. */
    const results = searchParams.get("media") === "multi"
        ? await tmdb.searchMulti(query, locale)
        : await tmdb.searchMovies(query, locale);
    return NextResponse.json(results);
}
