import { Film } from "lucide-react";
import { getTranslations } from "next-intl/server";
import clsx from "clsx";
import GoogleSignIn from "./GoogleSignIn";
import DevLogin from "./DevLogin";
import styles from "./login.module.css";

export default async function LoginPage() {
    const t = await getTranslations("login");
    const tCommon = await getTranslations("common");

    return (
        <div className={styles.screen}>
            <div className={styles.brand}>
                <Film size={36} className={styles.brandIcon} />
                <h1 className={styles.brandName}>{tCommon("appName")}</h1>
            </div>

            <div className={clsx("glass-card", styles.card)}>
                <h2 className={styles.title}>{t("title")}</h2>

                <GoogleSignIn />

                {/* Never rendered against the production deployment — see
                    the VERCEL_ENV check in /api/dev-login. */}
                {process.env.VERCEL_ENV !== "production" && <DevLogin />}
            </div>
        </div>
    );
}
