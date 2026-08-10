import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { devLoginSchema } from "@/lib/schemas";
import { parseBody } from "@/lib/validation";

/**
 * Vercel gives every preview deployment its own subdomain, and Google OAuth
 * only accepts pre-registered redirect URIs — so signing in with Google on a
 * preview branch is a dead end unless that URL gets added to the Google Cloud
 * console by hand, for every branch, forever. This mints the same session
 * JWT NextAuth would issue after a real Google sign-in (same trick as
 * e2e/auth.ts) for one of the already-seeded users instead, so previews and
 * local dev never need Google at all. `VERCEL_ENV` is only ever "production"
 * on the production deployment, so this 404s there.
 */
function disabled(): boolean {
    return process.env.VERCEL_ENV === "production";
}

export async function GET() {
    if (disabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, image: true },
        orderBy: { name: "asc" },
    });

    return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
    if (disabled()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await parseBody(req, devLoginSchema);
    if (!body.ok) return body.response;

    const user = await prisma.user.findUnique({ where: { id: body.data.userId } });
    if (!user) {
        return NextResponse.json({ error: "Unknown user" }, { status: 404 });
    }

    const token = await encode({
        token: { id: user.id, name: user.name, email: user.email },
        secret: process.env.NEXTAUTH_SECRET as string,
    });

    // Mirrors next-auth's own `defaultCookies()`: secure + `__Secure-`
    // prefixed cookies on https (every Vercel deployment), plain ones on
    // local http.
    const secure = req.nextUrl.protocol === "https:";
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
        name: `${secure ? "__Secure-" : ""}next-auth.session-token`,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure,
    });

    return response;
}
