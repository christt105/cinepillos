"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
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
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState<Date>(new Date());
    const [saving, setSaving] = useState(false);

    const handleSchedule = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/groups/${groupId}/meetings/${meetingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: date.toISOString() })
            });

            if (!res.ok) {
                alert("No se ha podido programar la sesión");
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
            <button className={clsx("btn btn-primary", className)} onClick={() => setOpen(true)}>
                <CalendarPlus size={16} /> Programar
            </button>

            {open && (
                <div className="modal-overlay" onClick={() => setOpen(false)}>
                    <div className="glass-card modal" onClick={e => e.stopPropagation()}>
                        <h3 className={styles.title}>Programar Sesión</h3>
                        <DateTimePicker value={date} onChange={setDate} />
                        <div className={styles.actions}>
                            <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSchedule} disabled={saving}>
                                {saving ? "Programando..." : "Programar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
