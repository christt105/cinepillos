import Link from "next/link";
import clsx from "clsx";
import styles from "./privacy.module.css";

export default function PrivacyPage() {
    return (
        <div className="page page-form">
            <h1 className="page-title">Política de privacidad</h1>

            <div className={clsx("glass-card", styles.card)}>
                <h2>Qué guardamos</h2>
                <p>
                    Tu nombre y tu email al iniciar sesión; los clubes de los que formas
                    parte; las películas que propones y votas dentro de cada club; y, si
                    eliges uno, un póster o una cara de reparto de TMDB como avatar.
                </p>

                <h2>Con quién se comparte</h2>
                <p>
                    Con nadie fuera de la app. Usamos Google solo para el inicio de
                    sesión y TMDB para los datos de las películas y los avatares;
                    ninguno de los dos recibe tu email más allá de lo necesario para
                    iniciar sesión. No usamos Gravatar ni guardamos tu foto de Google:
                    el avatar es siempre algo que tú eliges de TMDB, o el avatar por
                    defecto si no eliges ninguno.
                </p>

                <h2>Borrar tu cuenta</h2>
                <p>
                    Desde <Link href="/settings">Mi perfil</Link> puedes borrar tu cuenta
                    en cualquier momento. Esto elimina tu usuario junto con tus
                    propuestas y votos en todos los clubes; no queda rastro tuyo.
                </p>
            </div>
        </div>
    );
}
