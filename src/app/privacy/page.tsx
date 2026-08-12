import Link from "next/link";
import { getTranslations } from "next-intl/server";
import clsx from "clsx";
import styles from "./privacy.module.css";

export default async function PrivacyPage() {
    const t = await getTranslations("privacy");

    return (
        <div className="page page-form">
            <h1 className="page-title">{t("title")}</h1>

            <div className={clsx("glass-card", styles.card)}>
                <h2>{t("storedTitle")}</h2>
                <p>{t("storedText")}</p>

                <h2>{t("sharedTitle")}</h2>
                <p>{t("sharedText")}</p>

                <h2>{t("deleteTitle")}</h2>
                <p>
                    {t.rich("deleteText", {
                        profile: chunks => <Link href="/settings">{chunks}</Link>,
                    })}
                </p>
            </div>
        </div>
    );
}
