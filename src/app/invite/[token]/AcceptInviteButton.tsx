"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

export default function AcceptInviteButton({ token }: { token: string }) {
    const t = useTranslations("invite");
    const router = useRouter();
    const { update: updateSession } = useSession();
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState("");

    const handleJoin = async () => {
        setError("");
        setJoining(true);

        try {
            const res = await fetch(`/api/invitations/${token}`, { method: "POST" });

            if (res.ok) {
                const { groupId } = await res.json();
                await updateSession();
                router.push(`/g/${groupId}`);
            } else {
                setError(t("joinError"));
                setJoining(false);
            }
        } catch {
            setError(t("joinError"));
            setJoining(false);
        }
    };

    return (
        <>
            <button className="btn btn-primary" onClick={handleJoin} disabled={joining}>
                {joining ? t("joining") : t("join")}
            </button>
            {error && <p className="form-error">{error}</p>}
        </>
    );
}
