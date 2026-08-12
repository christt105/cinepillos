import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALE_TAGS, type Locale } from "@/i18n/config";

export const SITE_NAME = "CinePillos";

/** Branded card served by `/og`, used whenever a route has nothing better. */
export const DEFAULT_OG_IMAGE = { url: "/og", width: 1200, height: 630 };

/**
 * Public origin of the app. WhatsApp and Discord only follow absolute
 * `og:image` URLs, so every relative one has to resolve against this.
 */
export function siteUrl(): URL {
    return new URL(process.env.NEXTAUTH_URL || "http://localhost:6889");
}

type OgImage = { url: string; width: number; height: number };

type SocialMetadata = {
    title: string;
    description: string;
    /// Absolute URL, or a path relative to the site origin.
    image?: OgImage;
    locale?: Locale;
};

/**
 * Open Graph plus Twitter tags for a page, so a shared link renders as a card
 * with an image instead of bare text. `openGraph` is replaced wholesale when a
 * page defines it, never merged with the layout's, hence the shared builder.
 */
export function socialMetadata({
    title,
    description,
    image = DEFAULT_OG_IMAGE,
    locale = DEFAULT_LOCALE,
}: SocialMetadata): Metadata {
    const images = [{ ...image, alt: title }];

    return {
        title,
        description,
        openGraph: {
            type: "website",
            siteName: SITE_NAME,
            locale: LOCALE_TAGS[locale].replace("-", "_"),
            title,
            description,
            images,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images,
        },
    };
}
