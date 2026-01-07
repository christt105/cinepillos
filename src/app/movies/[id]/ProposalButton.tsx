"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

interface ProposalButtonProps {
    tmdbId: number;
    title: string;
    overview: string;
    posterPath: string | null;
    releaseDate: string;
    initialProposalId: string | null;
}

export function ProposalButton({ tmdbId, title, overview, posterPath, releaseDate, initialProposalId }: ProposalButtonProps) {
    const [proposalId, setProposalId] = useState<string | null>(initialProposalId);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handlePropose = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/proposals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tmdbId,
                    title,
                    overview,
                    posterPath,
                    releaseDate
                })
            });

            if (!res.ok) throw new Error("Failed to propose");

            const data = await res.json();
            setProposalId(data.id);
            router.refresh(); // Refresh server components to update UI if needed
        } catch (error) {
            console.error(error);
            alert("Error creating proposal");
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!proposalId) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/proposals/${proposalId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to remove proposal");

            setProposalId(null);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Error removing proposal");
        } finally {
            setLoading(false);
        }
    };

    if (proposalId) {
        return (
            <button
                onClick={handleRemove}
                className="btn"
                style={{ background: 'var(--destructive)', color: 'white', border: 'none' }}
                disabled={loading}
            >
                {loading ? "Procesando..." : (
                    <>
                        <Trash2 size={16} style={{ marginRight: 8 }} /> Quitar Propuesta
                    </>
                )}
            </button>
        );
    }

    return (
        <button
            onClick={handlePropose}
            className="btn btn-primary"
            disabled={loading}
        >
            {loading ? "Procesando..." : (
                <>
                    <Plus size={16} style={{ marginRight: 8 }} /> Proponer Película
                </>
            )}
        </button>
    );
}
