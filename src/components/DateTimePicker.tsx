"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import styles from "./DateTimePicker.module.css";

const ITEM_H = 48;

/** Month and weekday names for the active language, straight from `Intl`. */
function useCalendarNames() {
    const locale = useLocale();

    return useMemo(() => {
        const months = Array.from({ length: 12 }, (_, month) =>
            new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2026, month, 1))
        );
        // 2026-01-05 is a Monday, so the week reads Monday-first like the grid.
        const daysShort = Array.from({ length: 7 }, (_, day) =>
            new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2026, 0, 5 + day))
        );

        return { months, daysShort };
    }, [locale]);
}

function useDebouncedCallback<T extends unknown[]>(fn: (...args: T) => void, delay: number) {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fnRef = useRef(fn);

    useEffect(() => {
        fnRef.current = fn;
    });

    return useCallback((...args: T) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => fnRef.current(...args), delay);
    }, [delay]);
}

function DrumColumn({
    values, selected, onSelect, fmt = (v: number) => String(v).padStart(2, "0"),
}: {
    values: number[]; selected: number; onSelect: (v: number) => void; fmt?: (v: number) => string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const isUserScrolling = useRef(false);

    useEffect(() => {
        if (!ref.current || isUserScrolling.current) return;
        const idx = values.indexOf(selected);
        if (idx !== -1) ref.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    }, [selected, values]);

    const onScrollEnd = useDebouncedCallback(() => {
        if (!ref.current) return;
        const idx = Math.round(ref.current.scrollTop / ITEM_H);
        const val = values[Math.max(0, Math.min(idx, values.length - 1))];
        isUserScrolling.current = false;
        onSelect(val);
    }, 120);

    return (
        <div className={styles.column}>
            <div
                ref={ref}
                className={clsx("drum-col", styles.drum)}
                onScroll={() => { isUserScrolling.current = true; onScrollEnd(); }}
            >
                <div className={styles.spacer} />
                {values.map(v => (
                    <div
                        key={v}
                        onClick={() => { isUserScrolling.current = false; onSelect(v); }}
                        className={clsx(styles.item, v === selected && styles.itemSelected)}
                    >
                        {fmt(v)}
                    </div>
                ))}
                <div className={styles.spacer} />
            </div>
        </div>
    );
}

function TimePicker({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
    const t = useTranslations("datePicker");
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

    const setHour = (h: number) => { const d = new Date(selected); d.setHours(h); onSelect(d); };
    const setMinute = (m: number) => { const d = new Date(selected); d.setMinutes(m); onSelect(d); };

    const currentMinute = Math.round(selected.getMinutes() / 5) * 5 % 60;

    return (
        <div className={styles.time}>
            <p className={styles.timeLabel}>{t("time")}</p>

            <div className={styles.drums}>
                {/* Selection highlight */}
                <div className={styles.highlight} />

                <DrumColumn values={hours} selected={selected.getHours()} onSelect={setHour} />
                <span className={styles.separator}>:</span>
                <DrumColumn values={minutes} selected={currentMinute} onSelect={setMinute} />
            </div>
        </div>
    );
}

function CalendarPicker({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
    const { months, daysShort } = useCalendarNames();
    const [view, setView] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    const isSel = (d: number) => selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === d;
    const isToday = (d: number) => { const t = new Date(); return t.getFullYear() === year && t.getMonth() === month && t.getDate() === d; };
    const isPast = (d: number) => new Date(year, month, d + 1) <= new Date(new Date().setHours(0, 0, 0, 0));

    const pick = (day: number) => {
        if (isPast(day)) return;
        const d = new Date(selected);
        d.setFullYear(year, month, day);
        onSelect(d);
    };

    return (
        <div className={styles.calendar}>
            <div className={styles.calendarHeader}>
                <button className={clsx("btn btn-ghost", styles.calendarNav)} onClick={() => setView(new Date(year, month - 1, 1))}>
                    <ChevronLeft size={20} />
                </button>
                <span className={styles.calendarMonth}>{months[month]} {year}</span>
                <button className={clsx("btn btn-ghost", styles.calendarNav)} onClick={() => setView(new Date(year, month + 1, 1))}>
                    <ChevronRight size={20} />
                </button>
            </div>

            <div className={styles.days}>
                {daysShort.map(d => (
                    <div key={d} className={styles.dayName}>{d}</div>
                ))}
                {cells.map((day, i) => (
                    <div
                        key={i}
                        onClick={() => day && pick(day)}
                        className={clsx(
                            styles.day,
                            !day && styles.dayEmpty,
                            day && isPast(day) && styles.dayPast,
                            day && isToday(day) && styles.dayToday,
                            day && isSel(day) && styles.daySelected,
                        )}
                    >
                        {day}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function DateTimePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
    const { months, daysShort } = useCalendarNames();
    const [tab, setTab] = useState<"date" | "time">("date");

    const fmtDate = (d: Date) => `${daysShort[(d.getDay() + 6) % 7]}, ${d.getDate()} ${months[d.getMonth()]}`;
    const fmtTime = (d: Date) => `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;

    return (
        <div className={styles.picker}>
            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={clsx("btn", styles.tab, tab === "date" ? "btn-primary" : "btn-ghost")}
                    onClick={() => setTab("date")}
                >
                    📅 {fmtDate(value)}
                </button>
                <button
                    className={clsx("btn", styles.tab, tab === "time" ? "btn-primary" : "btn-ghost")}
                    onClick={() => setTab("time")}
                >
                    🕐 {fmtTime(value)}
                </button>
            </div>

            <div className={styles.panel}>
                {tab === "date"
                    ? <CalendarPicker selected={value} onSelect={onChange} />
                    : <TimePicker selected={value} onSelect={onChange} />
                }
            </div>
        </div>
    );
}
