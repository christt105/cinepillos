import { describe, it, expect, vi } from "vitest";
import type { OAuthConfig } from "next-auth/providers/oauth";
import type { GoogleProfile } from "next-auth/providers/google";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { authOptions } from "./auth";

const googleProvider = authOptions.providers[0] as OAuthConfig<GoogleProfile>;

const googleProfile = {
    sub: "115478236901234567890",
    name: "Ana",
    email: "ana@example.com",
    picture: "https://lh3.googleusercontent.com/a/photo",
} as GoogleProfile;

/**
 * next-auth only merges what we passed to `GoogleProvider(...)` over the
 * provider defaults when it handles a request, so until then our mapper sits
 * under `options`. Falling back to the default one keeps this test failing —
 * rather than silently passing — if the override is ever dropped.
 *
 * The result is what the adapter's `createUser` gets handed on a first sign-in.
 */
async function mapProfile() {
    const profile = googleProvider.options?.profile ?? googleProvider.profile;
    return await profile(googleProfile, {});
}

describe("Google provider profile", () => {
    it("never carries Google's photo into the created user", async () => {
        expect((await mapProfile()).image).toBeNull();
    });

    it("keeps the id, name and email", async () => {
        expect(await mapProfile()).toMatchObject({
            id: "115478236901234567890",
            name: "Ana",
            email: "ana@example.com",
        });
    });
});
