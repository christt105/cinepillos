"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Film, Calendar, User, LogOut, LogIn } from "lucide-react";
import clsx from "clsx";
import styles from "./Navbar.module.css";

export default function Navbar() {
    const { data: session } = useSession();

    return (
        <nav className={clsx(styles.navbar, "glass")}>
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
                <Link href="/" className={styles.logo}>
                    <Film className={styles.icon} />
                    <span>ClubDeCine</span>
                </Link>

                <div className={styles.links}>
                    {session ? (
                        <>
                            <Link href="/search" className={styles.link}>
                                Search
                            </Link>
                            <Link href="/meetings" className={styles.link}>
                                Meetings
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
                            Sign In
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
