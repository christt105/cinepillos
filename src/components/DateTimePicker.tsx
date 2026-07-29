"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_SHORT = ["L","M","X","J","V","S","D"];
const ITEM_H = 48;

function useDebouncedCallback<T extends unknown[]>(fn: (...args: T) => void, delay: number) {
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fnRef = useRef(fn);
    fnRef.current = fn;
    return useCallback((...args: T) => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => fnRef.current(...args), delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
                ref={ref}
                className="drum-col"
                onScroll={() => { isUserScrolling.current = true; onScrollEnd(); }}
                style={{
                    height: ITEM_H * 3,
                    overflowY: "scroll",
                    scrollSnapType: "y mandatory",
                    WebkitOverflowScrolling: "touch" as never,
                    scrollbarWidth: "none",
                    position: "relative",
                    width: 72,
                }}
            >
                <div style={{ height: ITEM_H }} />
                {values.map(v => (
                    <div
                        key={v}
                        onClick={() => { isUserScrolling.current = false; onSelect(v); }}
                        style={{
                            height: ITEM_H,
                            scrollSnapAlign: "center",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: v === selected ? "1.6rem" : "1.1rem",
                            fontWeight: v === selected ? 700 : 400,
                            opacity: v === selected ? 1 : 0.35,
                            cursor: "pointer",
                            transition: "opacity 0.15s, font-size 0.15s",
                            userSelect: "none",
                        }}
                    >
                        {fmt(v)}
                    </div>
                ))}
                <div style={{ height: ITEM_H }} />
            </div>
        </div>
    );
}

function TimePicker({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

    const setHour = (h: number) => { const d = new Date(selected); d.setHours(h); onSelect(d); };
    const setMinute = (m: number) => { const d = new Date(selected); d.setMinutes(m); onSelect(d); };

    const currentMinute = Math.round(selected.getMinutes() / 5) * 5 % 60;

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <p style={{ opacity: 0.5, fontSize: "0.8rem", marginBottom: "0.25rem" }}>Hora</p>

            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {/* Selection highlight */}
                <div style={{
                    position: "absolute", left: 0, right: 0,
                    top: ITEM_H, height: ITEM_H,
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: "0.5rem",
                    borderTop: "1px solid rgba(255,255,255,0.15)",
                    borderBottom: "1px solid rgba(255,255,255,0.15)",
                    pointerEvents: "none",
                }} />

                <DrumColumn values={hours} selected={selected.getHours()} onSelect={setHour} />
                <span style={{ fontSize: "1.8rem", fontWeight: 700, opacity: 0.6, marginTop: -4 }}>:</span>
                <DrumColumn values={minutes} selected={currentMinute} onSelect={setMinute} />
            </div>
        </div>
    );
}

function CalendarPicker({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
    const [view, setView] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    const isSel = (d: number) => selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === d;
    const isToday = (d: number) => { const t = new Date(); return t.getFullYear() === year && t.getMonth() === month && t.getDate() === d; };

    const pick = (day: number) => {
        const d = new Date(selected);
        d.setFullYear(year, month, day);
        onSelect(d);
    };

    return (
        <div style={{ userSelect: "none" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <button className="btn btn-ghost" style={{ padding: "0.5rem" }} onClick={() => setView(new Date(year, month - 1, 1))}>
                    <ChevronLeft size={20} />
                </button>
                <span style={{ fontWeight: 600 }}>{MONTHS[month]} {year}</span>
                <button className="btn btn-ghost" style={{ padding: "0.5rem" }} onClick={() => setView(new Date(year, month + 1, 1))}>
                    <ChevronRight size={20} />
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
                {DAYS_SHORT.map(d => (
                    <div key={d} style={{ textAlign: "center", fontSize: "0.75rem", opacity: 0.45, padding: "0.4rem 0", fontWeight: 600 }}>{d}</div>
                ))}
                {cells.map((day, i) => (
                    <div
                        key={i}
                        onClick={() => day && pick(day)}
                        style={{
                            minHeight: 44,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            borderRadius: "50%",
                            cursor: day ? "pointer" : "default",
                            fontSize: "0.95rem",
                            background: day && isSel(day) ? "hsl(var(--primary))" : "transparent",
                            color: day && isSel(day) ? "#fff" : day && isToday(day) ? "hsl(var(--secondary))" : "inherit",
                            fontWeight: (day && isSel(day)) || (day && isToday(day)) ? 700 : 400,
                            opacity: day ? 1 : 0,
                            WebkitTapHighlightColor: "transparent",
                        }}
                    >
                        {day}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function DateTimePicker({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
    const [tab, setTab] = useState<"date" | "time">("date");

    const fmtDate = (d: Date) => `${DAYS_SHORT[(d.getDay() + 6) % 7]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    const fmtTime = (d: Date) => `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                <button
                    className={tab === "date" ? "btn btn-primary" : "btn btn-ghost"}
                    onClick={() => setTab("date")}
                    style={{ flex: 1, fontSize: "0.95rem" }}
                >
                    📅 {fmtDate(value)}
                </button>
                <button
                    className={tab === "time" ? "btn btn-primary" : "btn btn-ghost"}
                    onClick={() => setTab("time")}
                    style={{ flex: 1, fontSize: "0.95rem" }}
                >
                    🕐 {fmtTime(value)}
                </button>
            </div>

            <div style={{ minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {tab === "date"
                    ? <CalendarPicker selected={value} onSelect={onChange} />
                    : <TimePicker selected={value} onSelect={onChange} />
                }
            </div>
        </div>
    );
}
