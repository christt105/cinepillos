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
                    Tu nombre, tu email y la foto de perfil de tu cuenta de Google al
                    iniciar sesión; los clubes de los que formas parte; y las películas
                    que propones y votas dentro de cada club.
                </p>

                <h2>Con quién se comparte</h2>
                <p>
                    Con nadie fuera de la app. Usamos Google para el inicio de sesión y
                    TMDB para los datos de las películas; ninguno de los dos recibe tu
                    email más allá de lo necesario para iniciar sesión. Actualmente
                    también usamos Gravatar como imagen de perfil de respaldo cuando no
                    tienes foto de Google, lo que envía un hash de tu email a ese
                    servicio.
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
