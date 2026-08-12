"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import clsx from "clsx";
import { avatarUrl } from "@/lib/avatar";
import styles from "./login.module.css";

type DevUser = { id: string; name: string | null; email: string; image: string | null };

function DevUserList() {
    const t = useTranslations("login");
    const searchParams = useSearchParams();
    // Same relative-only callback the Google button uses.
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    const [users, setUsers] = useState<DevUser[]>([]);
    const [pendingId, setPendingId] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/dev-login")
            .then(res => (res.ok ? res.json() : { users: [] }))
            .then(data => setUsers(data.users ?? []))
            .catch(() => setUsers([]));
    }, []);

    if (users.length === 0) return null;

    async function signInAs(userId: string) {
        setPendingId(userId);

        const res = await fetch("/api/dev-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
        });

        if (!res.ok) {
            setPendingId(null);
            return;
        }

        // A full navigation, not router.push: the destination reads the
        // session cookie server-side, and a client-side transition can race
        // the router cache and serve the pre-login render.
        window.location.assign(callbackUrl);
    }

    return (
        <div className={styles.devLogin}>
            <div className={styles.divider}>
                <span>{t("devOnly")}</span>
            </div>

            <div className={styles.devUsers}>
                {users.map(user => (
                    <button
                        key={user.id}
                        type="button"
                        disabled={pendingId !== null}
                        onClick={() => signInAs(user.id)}
                        className={clsx("btn btn-ghost", styles.devUser)}
                    >
                        <span className={clsx("avatar", styles.devUserAvatar)}>
                            <Image src={avatarUrl(user)} alt="" fill className={styles.devUserImage} />
                        </span>
                        {user.name || user.email}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function DevLogin() {
    return (
        <Suspense fallback={null}>
            <DevUserList />
        </Suspense>
    );
}
