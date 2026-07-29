"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Film, LogOut, LogIn, Menu, X, Settings } from "lucide-react";
import clsx from "clsx";
import styles from "./Navbar.module.css";
import { useState } from "react";

export default function Navbar() {
    const { data: session } = useSession();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className={clsx(styles.navbar, "glass")}>
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                <Link href="/" className={styles.logo}>
                    <Film className={styles.icon} />
                    <span>Zorropillos</span>
                </Link>

                {/* Desktop Links */}
                <div className={styles.links}>
                    {session ? (
                        <>
                            <Link href="/search" className={styles.link}>
                                Buscar
                            </Link>
                            <Link href="/meetings" className={styles.link}>
                                Reuniones
                            </Link>
                            {session.user?.activeFamilyId && (
                                <Link href={`/groups/${session.user.activeFamilyId}`} className={styles.link}>
                                    Mi Grupo
                                </Link>
                            )}
                            <div className={styles.userMenu}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '1rem' }}>
                                    <span className={styles.username}>{session.user?.name || session.user?.email}</span>
                                    {session.user?.families?.length > 0 && (
                                        <select 
                                            value={session.user.activeFamilyId || ""}
                                            onChange={async (e) => {
                                                await fetch('/api/users/activeFamily', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ familyId: e.target.value })
                                                });
                                                window.location.reload();
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#aaa',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="" disabled>Selecciona Grupo</option>
                                            {session.user.families.map(f => (
                                                <option key={f.id} value={f.id} style={{ color: 'black' }}>
                                                    {f.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
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
                                    href="/search"
                                    className={styles.link}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Buscar
                                </Link>
                                <Link
                                    href="/meetings"
                                    className={styles.link}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Reuniones
                                </Link>
                                {session.user?.activeFamilyId && (
                                    <Link
                                        href={`/groups/${session.user.activeFamilyId}`}
                                        className={styles.link}
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Mi Grupo
                                    </Link>
                                )}
                                <div className={styles.userMenu}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginRight: '1rem' }}>
                                        <span className={styles.username}>{session.user?.name || session.user?.email}</span>
                                        {session.user?.families?.length > 0 && (
                                            <select 
                                                value={session.user.activeFamilyId || ""}
                                                onChange={async (e) => {
                                                    await fetch('/api/users/activeFamily', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ familyId: e.target.value })
                                                    });
                                                    window.location.reload();
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#aaa',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    outline: 'none',
                                                    padding: 0,
                                                    marginTop: '4px'
                                                }}
                                            >
                                                <option value="" disabled>Selecciona Grupo</option>
                                                {session.user.families.map(f => (
                                                    <option key={f.id} value={f.id} style={{ color: 'black' }}>
                                                        {f.name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        {session.user?.isAdmin && (
                                            <Link href="/admin" className={styles.link} style={{ fontSize: '0.8rem', padding: 0, marginTop: '4px', opacity: 0.8 }}>
                                                Administración
                                            </Link>
                                        )}
                                    </div>
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
