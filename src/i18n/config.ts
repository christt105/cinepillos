export const LOCALES = ["es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** Castellano stays the default for everyone who has not picked a language. */
export const DEFAULT_LOCALE: Locale = "es";

export const LOCALE_COOKIE = "locale";

/** How each locale names itself, for the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
    es: "Castellano",
    en: "English",
};

/** The tag `Intl` and TMDB want, which is not the same as the cookie value. */
export const LOCALE_TAGS: Record<Locale, string> = {
    es: "es-ES",
    en: "en-US",
};

export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Locale straight out of a request's `Cookie` header. Route handlers use this
 * instead of `next/headers` so they stay plain request-in, response-out.
 */
export function localeFromCookieHeader(header: string | null): Locale {
    const match = header?.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
    const value = match?.[1];

    return isLocale(value) ? value : DEFAULT_LOCALE;
}
