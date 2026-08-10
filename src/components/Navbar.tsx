"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Film, LogOut, LogIn, Menu, X, Settings, Plus, ChevronDown } from "lucide-react";
import clsx from "clsx";
import styles from "./Navbar.module.css";
import { useState } from "react";

export default function Navbar() {
    const { data: session } = useSession();
    const params = useParams<{ groupId?: string }>();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const groups = session?.user?.groups ?? [];
    const currentGroupId = params?.groupId ?? session?.user?.activeGroupId ?? groups[0]?.id ?? null;

    const groupHref = (path: string) => (currentGroupId ? `/g/${currentGroupId}${path}` : "/");

    const groupControl = () => {
        if (groups.length === 0) {
            return <span className={styles.groupLabel}>Sin club</span>;
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
                    aria-label="Grupo activo"
                >
                    <option value="" disabled>Selecciona Grupo</option>
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
                    <span>CinePillos</span>
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
                                Buscar
                            </Link>
                            <Link href={groupHref("/meetings")} className={styles.link}>
                                Reuniones
                            </Link>
                            {currentGroupId && (
                                <Link href={groupHref("/members")} className={styles.link}>
                                    Mi Grupo
                                </Link>
                            )}
                            <div className={styles.userMenu}>
                                <div className={styles.identity}>
                                    {groupControl()}
                                    <span className={styles.username}>{session.user?.name || session.user?.email}</span>
                                    <Link href="/groups/new" className="btn btn-ghost" title="Crear club">
                                        <Plus size={18} />
                                    </Link>
                                    {session.user?.isAdmin && (
                                        <Link href="/admin" className={clsx(styles.link, styles.adminLink)}>
                                            Administración
                                        </Link>
                                    )}
                                </div>
                                <Link href="/settings" className="btn btn-ghost" title="Mi perfil">
                                    <Settings size={18} />
                                </Link>
                                <button onClick={() => signOut()} className="btn btn-ghost">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <Link href="/login" className="btn btn-primary">
                            <LogIn size={18} />
                            Entrar
                        </Link>
                    )}
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
                                    Buscar
                                </Link>
                                <Link
                                    href={groupHref("/meetings")}
                                    className={styles.link}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Reuniones
                                </Link>
                                {currentGroupId && (
                                    <Link
                                        href={groupHref("/members")}
                                        className={styles.link}
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Mi Grupo
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
                                            Crear club
                                        </Link>
                                        {session.user?.isAdmin && (
                                            <Link href="/admin" className={clsx(styles.link, styles.adminLink)}>
                                                Administración
                                            </Link>
                                        )}
                                    </div>
                                    <Link href="/settings" className="btn btn-ghost" onClick={() => setIsMenuOpen(false)}>
                                        <Settings size={18} />
                                    </Link>
                                    <button onClick={() => signOut()} className="btn btn-ghost">
                                        <LogOut size={18} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <Link href="/login" className="btn btn-primary btn-block">
                                <LogIn size={18} />
                                Entrar
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}
