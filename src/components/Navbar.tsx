"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Film, LogOut, LogIn, Menu, X, Settings } from "lucide-react";
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

    const groupSelector = (extraStyle: React.CSSProperties) => (
        <select
            value={currentGroupId ?? ""}
            onChange={(e) => router.push(`/g/${e.target.value}`)}
            style={{
                background: 'transparent',
                border: 'none',
                color: '#aaa',
                fontSize: '0.8rem',
                cursor: 'pointer',
                outline: 'none',
                ...extraStyle
            }}
        >
            <option value="" disabled>Selecciona Grupo</option>
            {groups.map(g => (
                <option key={g.id} value={g.id} style={{ color: 'black' }}>
                    {g.name}
                </option>
            ))}
        </select>
    );

    return (
        <nav className={clsx(styles.navbar, "glass")}>
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                <Link href={groupHref("")} className={styles.logo}>
                    <Film className={styles.icon} />
                    <span>Zorropillos</span>
                </Link>

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
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '1rem' }}>
                                    <span className={styles.username}>{session.user?.name || session.user?.email}</span>
                                    {groups.length > 0 && groupSelector({})}
                                    {session.user?.isAdmin && (
                                        <Link href="/admin" className={styles.link} style={{ fontSize: '0.8rem', padding: 0, marginTop: '4px', opacity: 0.8 }}>
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
                            <LogIn size={18} style={{ marginRight: '0.5rem' }} />
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
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginRight: '1rem' }}>
                                        <span className={styles.username}>{session.user?.name || session.user?.email}</span>
                                        {groups.length > 0 && groupSelector({ padding: 0, marginTop: '4px' })}
                                        {session.user?.isAdmin && (
                                            <Link href="/admin" className={styles.link} style={{ fontSize: '0.8rem', padding: 0, marginTop: '4px', opacity: 0.8 }}>
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
                            <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
                                <LogIn size={18} style={{ marginRight: '0.5rem' }} />
                                Entrar
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}
