import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tmdb } from "@/lib/tmdb";
import { localeFromCookieHeader } from "@/i18n/config";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const locale = localeFromCookieHeader(request.headers.get("cookie"));
    const { genres } = await tmdb.getGenres(locale);

    return NextResponse.json(genres ?? []);
}
