"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import DateTimePicker from "@/components/DateTimePicker";
import styles from "./ScheduleMeetingButton.module.css";

interface ScheduleMeetingButtonProps {
    groupId: string;
    meetingId: string;
    className?: string;
    /// Called instead of refreshing the route when the caller keeps the
    /// meetings in its own state.
    onScheduled?: () => void;
}

/**
 * Puts a date on a meeting still in PLANNING, which moves it to VOTING. Lives
 * in its own client component so server pages can offer the action too.
 */
export default function ScheduleMeetingButton({
    groupId,
    meetingId,
    className,
    onScheduled,
}: ScheduleMeetingButtonProps) {
    const t = useTranslations("schedule");
    const tCommon = useTranslations("common");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState<Date>(new Date());
    const [saving, setSaving] = useState(false);

    /** Blocks the page behind the picker from scrolling while it's open. */
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    /**
     * `date` keeps whatever time-of-day it already held, so opening the
     * picker straight from its stale initial state would show today with a
     * time that's already in the past and get rejected by the future-date
     * check. Bumping it forward on open keeps "today" pickable.
     */
    const openModal = () => {
        setDate(new Date(Date.now() + 30 * 60 * 1000));
        setOpen(true);
    };

    const handleSchedule = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/groups/${groupId}/meetings/${meetingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: date.toISOString() })
            });

            if (!res.ok) {
                alert(t("error"));
                return;
            }

            setOpen(false);
            if (onScheduled) onScheduled();
            else router.refresh();
        } catch (error) {
            console.error("Schedule meeting failed", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <button className={clsx("btn btn-primary", className)} onClick={openModal}>
                <CalendarPlus size={16} /> {t("action")}
            </button>

            {/* Portalled for the same reason as the film picker (063487f):
                backdrop-filter on .glass-card makes the surrounding card a
                containing block, which would clip this fixed overlay to it. */}
            {open && createPortal(
                <div className="modal-overlay" onClick={() => setOpen(false)}>
                    <div className="glass-card modal" onClick={e => e.stopPropagation()}>
                        <h3 className={styles.title}>{t("title")}</h3>
                        <DateTimePicker value={date} onChange={setDate} />
                        <div className={styles.actions}>
                            <button className="btn btn-ghost" onClick={() => setOpen(false)}>{tCommon("cancel")}</button>
                            <button className="btn btn-primary" onClick={handleSchedule} disabled={saving}>
                                {saving ? t("saving") : t("action")}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
