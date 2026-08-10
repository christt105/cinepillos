import Image from "next/image";
import styles from "./Footer.module.css";

export default function Footer() {
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
        </footer>
    );
}
