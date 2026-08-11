import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { Film, LogIn } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { resolveLandingGroupId } from "@/lib/group-page";
import styles from "./landing.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("landing");
  const tCommon = await getTranslations("common");

  if (!session?.user?.id) {
    return (
      <div className={styles.landing}>
        <div className={styles.brand}>
          <Film size={40} className={styles.brandIcon} />
          <h1 className={styles.brandName}>{tCommon("appName")}</h1>
        </div>
        <p className={styles.pitch}>{t("pitch")}</p>
        <Link href="/login" className="btn btn-primary">
          <LogIn size={18} /> {t("signInWithGoogle")}
        </Link>
        <Link href="/privacy" className={styles.privacyLink}>
          {t("privacyLink")}
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
      <h2 className="notice-title">{t("welcomeTitle")}</h2>
      <p className="notice-text">{t("noClubText")}</p>
      <Link href="/groups/new" className="btn btn-primary">{t("createClub")}</Link>
    </div>
  );
}
