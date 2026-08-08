import type { Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { E2E } from "../playwright.config";

/**
 * There is no credentials provider to drive through the UI anymore, and
 * scripting a real Google OAuth consent screen isn't practical in CI. Instead
 * this mints the same JWT NextAuth would issue after a real Google sign-in
 * and drops it in as the session cookie, which is what `getServerSession`
 * actually reads on every request.
 */
export async function signIn(page: Page, email: string = E2E.christian) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    const token = await encode({
        token: { id: user.id, name: user.name, email: user.email },
        secret: E2E.nextAuthSecret,
    });

    await page.context().addCookies([
        {
            name: "next-auth.session-token",
            value: token,
            url: E2E.baseURL,
        },
    ]);

    return user;
}
