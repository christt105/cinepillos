import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function Forbidden() {
    const t = await getTranslations("forbidden");
    const tCommon = await getTranslations("common");

    return (
        <div className="glass-card notice">
            <h2 className="notice-title">{t("title")}</h2>
            <p className="notice-text">{t("text")}</p>
            <Link href="/" className="btn btn-primary">{tCommon("backHome")}</Link>
        </div>
    );
}
