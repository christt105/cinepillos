"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
    const t = useTranslations("movie");
    const { groupId } = useParams<{ groupId: string }>();
    const [proposalId, setProposalId] = useState<string | null>(initialProposalId);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handlePropose = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/groups/${groupId}/proposals`, {
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
            alert(t("errorPropose"));
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!proposalId) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/groups/${groupId}/proposals/${proposalId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to remove proposal");

            setProposalId(null);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert(t("errorRemove"));
        } finally {
            setLoading(false);
        }
    };

    if (proposalId) {
        return (
            <button
                onClick={handleRemove}
                className="btn btn-danger"
                disabled={loading}
            >
                {loading ? t("processing") : (
                    <>
                        <Trash2 size={16} /> {t("removeProposal")}
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
            {loading ? t("processing") : (
                <>
                    <Plus size={16} /> {t("proposeFilm")}
                </>
            )}
        </button>
    );
}
