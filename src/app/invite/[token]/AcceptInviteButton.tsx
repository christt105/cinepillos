"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AcceptInviteButton({ token }: { token: string }) {
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
                setError("No se ha podido completar la unión al club. Prueba a recargar la página.");
                setJoining(false);
            }
        } catch {
            setError("No se ha podido completar la unión al club. Prueba a recargar la página.");
            setJoining(false);
        }
    };

    return (
        <>
            <button className="btn btn-primary" onClick={handleJoin} disabled={joining}>
                {joining ? "Uniéndote..." : "Unirme al club"}
            </button>
            {error && <p className="form-error">{error}</p>}
        </>
    );
}
