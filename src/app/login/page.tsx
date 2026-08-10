import { Film } from "lucide-react";
import clsx from "clsx";
import GoogleSignIn from "./GoogleSignIn";
import DevLogin from "./DevLogin";
import styles from "./login.module.css";

export default function LoginPage() {
    return (
        <div className={styles.screen}>
            <div className={styles.brand}>
                <Film size={36} className={styles.brandIcon} />
                <h1 className={styles.brandName}>CinePillos</h1>
            </div>

            <div className={clsx("glass-card", styles.card)}>
                <h2 className={styles.title}>Entrar</h2>

                <GoogleSignIn />

                {/* Never rendered against the production deployment — see
                    the VERCEL_ENV check in /api/dev-login. */}
                {process.env.VERCEL_ENV !== "production" && <DevLogin />}
            </div>
        </div>
    );
}
