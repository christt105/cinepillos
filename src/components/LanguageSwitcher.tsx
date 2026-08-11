"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, isLocale } from "@/i18n/config";
import styles from "./LanguageSwitcher.module.css";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Stores the chosen language in the cookie the request config reads, then
 * refreshes so every server component re-renders with the new messages.
 */
export default function LanguageSwitcher({ className }: { className?: string }) {
    const t = useTranslations("language");
    const locale = useLocale();
    const router = useRouter();
    const [, startTransition] = useTransition();

    const handleChange = (value: string) => {
        if (!isLocale(value)) return;

        document.cookie = `${LOCALE_COOKIE}=${value};path=/;max-age=${ONE_YEAR};samesite=lax`;
        startTransition(() => router.refresh());
    };

    return (
        <div className={styles.wrap}>
            <select
                value={locale}
                onChange={event => handleChange(event.target.value)}
                className={`${styles.select} ${className ?? ""}`}
                aria-label={t("label")}
            >
                {LOCALES.map(option => (
                    <option key={option} value={option}>
                        {LOCALE_NAMES[option]}
                    </option>
                ))}
            </select>
            <ChevronDown size={14} className={styles.icon} />
        </div>
    );
}
