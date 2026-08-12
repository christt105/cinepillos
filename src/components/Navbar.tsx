"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Film, LogOut, LogIn, Menu, X, Settings, Plus, ChevronDown } from "lucide-react";
import clsx from "clsx";
import LanguageSwitcher from "./LanguageSwitcher";
import styles from "./Navbar.module.css";
import { useState } from "react";

export default function Navbar() {
    const t = useTranslations("nav");
    const tCommon = useTranslations("common");
    const { data: session } = useSession();
    const params = useParams<{ groupId?: string }>();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const groups = session?.user?.groups ?? [];
    const currentGroupId = params?.groupId ?? session?.user?.activeGroupId ?? groups[0]?.id ?? null;

    const groupHref = (path: string) => (currentGroupId ? `/g/${currentGroupId}${path}` : "/");

    const groupControl = () => {
        if (groups.length === 0) {
            return <span className={styles.groupLabel}>{t("noClub")}</span>;
        }
        if (groups.length === 1) {
            return <span className={styles.groupLabel}>{groups[0].name}</span>;
        }
        return (
            <div className={styles.groupSelectWrap}>
                <select
                    value={currentGroupId ?? ""}
                    onChange={(e) => router.push(`/g/${e.target.value}`)}
                    className={styles.groupSelect}
                    aria-label={t("activeGroup")}
                >
                    <option value="" disabled>{t("selectGroup")}</option>
                    {groups.map(g => (
                        <option key={g.id} value={g.id}>
                            {g.name}
                        </option>
                    ))}
                </select>
                <ChevronDown size={16} className={styles.groupSelectIcon} />
            </div>
        );
    };

    return (
        <nav className={clsx(styles.navbar, "glass")}>
            <div className={clsx("container", styles.bar)}>
                <Link href={groupHref("")} className={styles.logo}>
                    <Film className={styles.icon} />
                    <span>{tCommon("appName")}</span>
                </Link>

                {/* Group indicator kept out of the hamburger menu so the active
                    club is visible on mobile without opening anything */}
                {session && (
                    <div className={styles.mobileGroupBar}>
                        {groupControl()}
                    </div>
                )}

                {/* Desktop Links */}
                <div className={styles.links}>
                    {session ? (
                        <>
                            <Link href={groupHref("/search")} className={styles.link}>
                                {t("search")}
                            </Link>
                            <Link href={groupHref("/meetings")} className={styles.link}>
                                {t("meetings")}
                            </Link>
                            {currentGroupId && (
                                <Link href={groupHref("/members")} className={styles.link}>
                                    {t("myGroup")}
                                </Link>
                            )}
                            {currentGroupId && (
                                <Link href={groupHref("/likes")} className={styles.link}>
                                    {t("myLikes")}
                                </Link>
                            )}
                            <div className={styles.userMenu}>
                                <div className={styles.identity}>
                                    {groupControl()}
                                    <span className={styles.username}>{session.user?.name || session.user?.email}</span>
                                    <Link href="/groups/new" className="btn btn-ghost" title={t("createClub")}>
                                        <Plus size={18} />
                                    </Link>
                                    {session.user?.isAdmin && (
                                        <Link href="/admin" className={clsx(styles.link, styles.adminLink)}>
                                            {t("admin")}
                                        </Link>
                                    )}
                                </div>
                                <Link href="/settings" className="btn btn-ghost" title={t("profile")}>
                                    <Settings size={18} />
                                </Link>
                                <button onClick={() => signOut()} className="btn btn-ghost" title={t("signOut")}>
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <Link href="/login" className="btn btn-primary">
                            <LogIn size={18} />
                            {t("signIn")}
                        </Link>
                    )}
                    <LanguageSwitcher />
                </div>

                {/* Mobile Menu Button */}
                <button
                    className={styles.mobileMenuBtn}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Mobile Menu Dropdown */}
                {isMenuOpen && (
                    <div className={styles.mobileMenu}>
                        {session ? (
                            <>
                                <Link
                                    href={groupHref("/search")}
                                    className={styles.link}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {t("search")}
                                </Link>
                                <Link
                                    href={groupHref("/meetings")}
                                    className={styles.link}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {t("meetings")}
                                </Link>
                                {currentGroupId && (
                                    <Link
                                        href={groupHref("/members")}
                                        className={styles.link}
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        {t("myGroup")}
                                    </Link>
                                )}
                                {currentGroupId && (
                                    <Link
                                        href={groupHref("/likes")}
                                        className={styles.link}
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        {t("myLikes")}
                                    </Link>
                                )}
                                <div className={styles.userMenu}>
                                    <div className={styles.identity}>
                                        <span className={styles.username}>{session.user?.name || session.user?.email}</span>
                                        <Link
                                            href="/groups/new"
                                            className={styles.link}
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            {t("createClub")}
                                        </Link>
                                        {session.user?.isAdmin && (
                                            <Link href="/admin" className={clsx(styles.link, styles.adminLink)}>
                                                {t("admin")}
                                            </Link>
                                        )}
                                    </div>
                                    <Link href="/settings" className="btn btn-ghost" onClick={() => setIsMenuOpen(false)}>
                                        <Settings size={18} />
                                    </Link>
                                    <button onClick={() => signOut()} className="btn btn-ghost" title={t("signOut")}>
                                        <LogOut size={18} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <Link href="/login" className="btn btn-primary btn-block">
                                <LogIn size={18} />
                                {t("signIn")}
                            </Link>
                        )}
                        <LanguageSwitcher />
                    </div>
                )}
            </div>
        </nav>
    );
}
