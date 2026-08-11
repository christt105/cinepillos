import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config";

/** The language the visitor picked, or castellano when they never did. */
export async function resolveLocale() {
    const value = (await cookies()).get(LOCALE_COOKIE)?.value;

    return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * next-intl without URL routing: the locale lives in a cookie, so no route has
 * to grow a `/[locale]` segment and existing links keep working.
 */
export default getRequestConfig(async () => {
    const locale = await resolveLocale();

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default,
    };
});
