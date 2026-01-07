"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Film, Calendar, User, LogOut, LogIn, Menu, X } from "lucide-react";
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
                            <div className={styles.userMenu}>
                                <span className={styles.username}>{session.user?.name || session.user?.email}</span>
                                <button onClick={() => signOut()} className="btn btn-ghost">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <button onClick={() => signIn()} className="btn btn-primary">
                            <LogIn size={18} style={{ marginRight: '0.5rem' }} />
                            Entrar
                        </button>
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
                                <div className={styles.userMenu}>
                                    <span className={styles.username}>{session.user?.name || session.user?.email}</span>
                                    <button onClick={() => signOut()} className="btn btn-ghost">
                                        <LogOut size={18} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <button onClick={() => signIn()} className="btn btn-primary" style={{ width: '100%' }}>
                                <LogIn size={18} style={{ marginRight: '0.5rem' }} />
                                Entrar
                            </button>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}
