"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import styles from "./login.module.css";

/// next-auth redirects back here with `?error=<code>` and no other trace, so
/// without this every failure looks like the button doing nothing.
const ERROR_MESSAGES: Record<string, string> = {
    Configuration: "El servidor de acceso está mal configurado. Avisa al administrador.",
    AccessDenied: "Has cancelado el acceso o tu cuenta no tiene permiso.",
    OAuthAccountNotLinked: "Ya existe una cuenta con ese correo creada por otra vía.",
    OAuthCreateAccount: "No se ha podido crear tu cuenta. Avisa al administrador.",
    OAuthCallback: "Google ha rechazado la vuelta al sitio. Inténtalo de nuevo.",
    OAuthSignin: "No se ha podido contactar con Google. Inténtalo de nuevo.",
    SessionRequired: "Necesitas iniciar sesión para ver esa página.",
};

function SignInButton() {
    const searchParams = useSearchParams();
    // Only ever a relative, same-app path (e.g. an invite link resumed after
    // login); next-auth itself refuses to redirect to a different origin.
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const error = searchParams.get("error");

    return (
        <>
            {error && (
                <p className={clsx("form-error", styles.error)} role="alert">
                    {ERROR_MESSAGES[error] ?? "No se ha podido iniciar sesión."}
                </p>
            )}

            <button
                type="button"
                onClick={() => signIn("google", { callbackUrl })}
                className={clsx("btn btn-primary", styles.submit)}
            >
                <GoogleIcon />
                Continuar con Google
            </button>
        </>
    );
}

export default function GoogleSignIn() {
    return (
        <Suspense fallback={null}>
            <SignInButton />
        </Suspense>
    );
}

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
    );
}
