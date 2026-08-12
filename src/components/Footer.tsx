import Image from "next/image";
import { Github, Coffee } from "lucide-react";
import { getTranslations } from "next-intl/server";
import styles from "./Footer.module.css";

const REPO_URL = "https://github.com/christt105/cinepillos";
const KOFI_URL = "https://ko-fi.com/christt105";

export default async function Footer() {
    const t = await getTranslations("footer");

    return (
        <footer className={styles.footer}>
            <div className={styles.bar}>
                <a
                    href="https://www.themoviedb.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attribution}
                >
                    <Image src="/attribution/tmdb-logo.svg" alt="TMDB" width={92} height={12} />
                    <span>
                        This product uses the TMDB API but is not endorsed or
                        certified by TMDB.
                    </span>
                </a>
                <a
                    href="https://thetvdb.com/subscribe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attribution}
                >
                    <Image src="/attribution/tvdb-logo.png" alt="TheTVDB" width={44} height={24} />
                    <span>
                        Metadata provided by TheTVDB. Please consider adding
                        missing information or subscribing.
                    </span>
                </a>
            </div>
            <div className={styles.links}>
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    <Github size={16} />
                    <span>{t("sourceCode")}</span>
                </a>
                <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    <Coffee size={16} />
                    <span>{t("support")}</span>
                </a>
            </div>
        </footer>
    );
}
