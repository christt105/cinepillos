import { NextResponse } from "next/server";
import { tmdb } from "@/lib/tmdb";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
        const trending = await tmdb.getTrending();
        return NextResponse.json(trending);
    }

    const results = await tmdb.searchMovies(query);
    return NextResponse.json(results);
}
