import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Film, LogIn } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { resolveLandingGroupId } from "@/lib/group-page";
import styles from "./landing.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className={styles.landing}>
        <div className={styles.brand}>
          <Film size={40} className={styles.brandIcon} />
          <h1 className={styles.brandName}>CinePillos</h1>
        </div>
        <p className={styles.pitch}>
          Organiza las noches de cine de tu grupo de amigos: proponed
          películas, programad una sesión y votad qué veis. Cada club es
          privado, solo lo ve quien está dentro.
        </p>
        <Link href="/login" className="btn btn-primary">
          <LogIn size={18} /> Entrar con Google
        </Link>
        <Link href="/privacy" className={styles.privacyLink}>
          Política de privacidad
        </Link>
      </div>
    );
  }

  const groupId = await resolveLandingGroupId();

  if (groupId) {
    redirect(`/g/${groupId}`);
  }

  return (
    <div className="glass-card notice">
      <h2 className="notice-title">¡Bienvenido!</h2>
      <p className="notice-text">Todavía no formas parte de ningún club de cine.</p>
      <Link href="/groups/new" className="btn btn-primary">Crear un club</Link>
    </div>
  );
}
