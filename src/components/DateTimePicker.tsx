"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DAYS = ["L", "M", "X", "J", "V", "S", "D"];

function CalendarPicker({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
    const [view, setView] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));

    const year = view.getFullYear();
    const month = view.getMonth();

    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    const isSelected = (day: number) =>
        selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day;

    const isToday = (day: number) => {
        const t = new Date();
        return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
    };

    const pick = (day: number) => {
        const d = new Date(selected);
        d.setFullYear(year, month, day);
        onSelect(d);
    };

    return (
        <div style={{ userSelect: "none" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <button className="btn btn-ghost" style={{ padding: "0.3rem" }} onClick={() => setView(new Date(year, month - 1, 1))}>
                    <ChevronLeft size={18} />
                </button>
                <span style={{ fontWeight: 600 }}>{MONTHS[month]} {year}</span>
                <button className="btn btn-ghost" style={{ padding: "0.3rem" }} onClick={() => setView(new Date(year, month + 1, 1))}>
                    <ChevronRight size={18} />
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", textAlign: "center" }}>
                {DAYS.map(d => (
                    <div key={d} style={{ fontSize: "0.75rem", opacity: 0.5, padding: "0.3rem 0" }}>{d}</div>
                ))}
                {cells.map((day, i) => (
                    <div
                        key={i}
                        onClick={() => day && pick(day)}
                        style={{
                            padding: "0.45rem 0", borderRadius: "50%", cursor: day ? "pointer" : "default",
                            fontSize: "0.9rem",
                            background: day && isSelected(day) ? "hsl(var(--primary))" : "transparent",
                            color: day && isSelected(day) ? "#fff" : day && isToday(day) ? "hsl(var(--secondary))" : "inherit",
                            fontWeight: day && isToday(day) ? 700 : 400,
                            opacity: day ? 1 : 0,
                            transition: "background 0.15s",
                        }}
                        onMouseEnter={e => { if (day && !isSelected(day)) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.1)"; }}
                        onMouseLeave={e => { if (day && !isSelected(day)) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                        {day}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ClockPicker({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
    const [mode, setMode] = useState<"hour" | "minute">("hour");
    const hours = selected.getHours();
    const minutes = selected.getMinutes();

    const SIZE = 220;
    const R = SIZE / 2;
    const HAND_R = R - 28;

    const angleFor = (val: number, total: number) => (val / total) * 360 - 90;

    const pickFromEvent = useCallback((e: React.MouseEvent<SVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = rect.left + R;
        const cy = rect.top + R;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        const normalized = ((angle % 360) + 360) % 360;

        const d = new Date(selected);
        if (mode === "hour") {
            const h = Math.round(normalized / 30) % 12 || 12;
            const isAm = hours < 12;
            d.setHours(isAm ? h % 12 : (h % 12) + 12, minutes);
            onSelect(d);
            setMode("minute");
        } else {
            const m = Math.round(normalized / 6) % 60;
            d.setMinutes(m);
            onSelect(d);
        }
    }, [mode, selected, hours, minutes, onSelect]);

    const ticksCount = mode === "hour" ? 12 : 60;
    const majorEvery = mode === "hour" ? 1 : 5;

    const handAngle = mode === "hour"
        ? angleFor(hours % 12 || 12, 12) + 90
        : angleFor(minutes, 60) + 90;

    const handX = R + HAND_R * Math.cos((handAngle * Math.PI) / 180);
    const handY = R + HAND_R * Math.sin((handAngle * Math.PI) / 180);

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "2rem", fontWeight: 700 }}>
                <button
                    onClick={() => setMode("hour")}
                    style={{ background: mode === "hour" ? "hsl(var(--primary))" : "transparent", border: "none", color: "white", borderRadius: "0.4rem", padding: "0.1rem 0.4rem", cursor: "pointer", fontSize: "2rem", fontWeight: 700 }}
                >
                    {String(hours).padStart(2, "0")}
                </button>
                <span>:</span>
                <button
                    onClick={() => setMode("minute")}
                    style={{ background: mode === "minute" ? "hsl(var(--primary))" : "transparent", border: "none", color: "white", borderRadius: "0.4rem", padding: "0.1rem 0.4rem", cursor: "pointer", fontSize: "2rem", fontWeight: 700 }}
                >
                    {String(minutes).padStart(2, "0")}
                </button>
            </div>

            <svg
                width={SIZE} height={SIZE}
                style={{ cursor: "crosshair" }}
                onClick={pickFromEvent}
            >
                {/* Face */}
                <circle cx={R} cy={R} r={R - 2} fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />

                {/* Ticks */}
                {Array.from({ length: ticksCount }, (_, i) => {
                    const a = ((i / ticksCount) * 360 - 90) * (Math.PI / 180);
                    const outer = R - 10;
                    const inner = outer - (i % majorEvery === 0 ? 10 : 5);
                    return (
                        <line
                            key={i}
                            x1={R + inner * Math.cos(a)} y1={R + inner * Math.sin(a)}
                            x2={R + outer * Math.cos(a)} y2={R + outer * Math.sin(a)}
                            stroke={i % majorEvery === 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)"}
                            strokeWidth={i % majorEvery === 0 ? 2 : 1}
                        />
                    );
                })}

                {/* Labels (hour numbers) */}
                {mode === "hour" && Array.from({ length: 12 }, (_, i) => {
                    const a = ((i / 12) * 360 - 90) * (Math.PI / 180);
                    const lr = R - 26;
                    return (
                        <text
                            key={i}
                            x={R + lr * Math.cos(a)} y={R + lr * Math.sin(a)}
                            textAnchor="middle" dominantBaseline="central"
                            fill="white" fontSize={12} fontWeight={600}
                        >
                            {i === 0 ? 12 : i}
                        </text>
                    );
                })}

                {/* Minute labels */}
                {mode === "minute" && [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m, i) => {
                    const a = ((i / 12) * 360 - 90) * (Math.PI / 180);
                    const lr = R - 26;
                    return (
                        <text
                            key={m}
                            x={R + lr * Math.cos(a)} y={R + lr * Math.sin(a)}
                            textAnchor="middle" dominantBaseline="central"
                            fill="white" fontSize={11} fontWeight={600}
                        >
                            {String(m).padStart(2, "0")}
                        </text>
                    );
                })}

                {/* Hand */}
                <line
                    x1={R} y1={R}
                    x2={handX} y2={handY}
                    stroke="hsl(var(--primary))" strokeWidth={3} strokeLinecap="round"
                />
                <circle cx={R} cy={R} r={4} fill="hsl(var(--primary))" />
                <circle cx={handX} cy={handY} r={8} fill="hsl(var(--primary))" opacity={0.85} />
            </svg>

            <p style={{ opacity: 0.5, fontSize: "0.8rem" }}>
                {mode === "hour" ? "Haz clic para elegir la hora" : "Haz clic para elegir los minutos"}
            </p>
        </div>
    );
}

interface Props {
    value: Date;
    onChange: (d: Date) => void;
}

export default function DateTimePicker({ value, onChange }: Props) {
    return (
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
            <div>
                <h4 style={{ marginBottom: "0.75rem", opacity: 0.7, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Fecha</h4>
                <CalendarPicker selected={value} onSelect={onChange} />
            </div>
            <div>
                <h4 style={{ marginBottom: "0.75rem", opacity: 0.7, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Hora</h4>
                <ClockPicker selected={value} onSelect={onChange} />
            </div>
        </div>
    );
}
