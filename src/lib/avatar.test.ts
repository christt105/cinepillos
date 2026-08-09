import { describe, it, expect } from "vitest";
import { avatarUrl } from "./avatar";

describe("avatarUrl", () => {
    it("builds a TMDB image URL from a stored path", () => {
        expect(avatarUrl({ image: "/abc123.jpg" })).toBe("https://image.tmdb.org/t/p/w200/abc123.jpg");
    });

    it("falls back to the bundled default when there is no image", () => {
        expect(avatarUrl({ image: null })).toBe("/default-avatar.svg");
    });

    it("falls back to the default for a leftover non-TMDB URL", () => {
        expect(avatarUrl({ image: "https://lh3.googleusercontent.com/a/old-photo" })).toBe("/default-avatar.svg");
    });
});
