import { describe, it, expect } from "vitest";
import { isLocale, localeFromCookieHeader } from "./config";

describe("isLocale", () => {
    it("accepts the supported languages", () => {
        expect(isLocale("es")).toBe(true);
        expect(isLocale("en")).toBe(true);
    });

    it("rejects anything else", () => {
        expect(isLocale("fr")).toBe(false);
        expect(isLocale(undefined)).toBe(false);
        expect(isLocale(7)).toBe(false);
    });
});

describe("localeFromCookieHeader", () => {
    it("reads the locale cookie", () => {
        expect(localeFromCookieHeader("locale=en")).toBe("en");
    });

    it("finds it among other cookies", () => {
        expect(localeFromCookieHeader("next-auth.session-token=abc; locale=en; other=1")).toBe("en");
    });

    it("is not fooled by a cookie whose name ends in locale", () => {
        expect(localeFromCookieHeader("my-locale=en")).toBe("es");
    });

    it("falls back to castellano without a cookie", () => {
        expect(localeFromCookieHeader(null)).toBe("es");
        expect(localeFromCookieHeader("")).toBe("es");
    });

    it("falls back to castellano for an unsupported language", () => {
        expect(localeFromCookieHeader("locale=klingon")).toBe("es");
    });
});
