"use client";

import { useState } from "react";
import { format } from "path"; // Wait, path is node. Use native date.
import { Calendar as CalendarIcon, ThumbsUp, Plus } from "lucide-react";

// Mock Data
const MOCK_MEETINGS = [
    {
        id: "1",
        date: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
        status: "VOTING",
        candidates: [
            { id: "c1", film: { title: "Inception", year: 2010 }, votes: 3 },
            { id: "c2", film: { title: "Dune: Part Two", year: 2024 }, votes: 5 },
        ],
    },
    {
        id: "2",
        date: new Date(Date.now() + 86400000 * 12).toISOString(),
        status: "PLANNING",
        candidates: [],
    },
];

export default function MeetingsPage() {
    const [meetings, setMeetings] = useState(MOCK_MEETINGS);

    const handleVote = (meetingId: string, candidateId: string) => {
        alert("Vote recorded! (Mock)");
        setMeetings(prev => prev.map(m => {
            if (m.id !== meetingId) return m;
            return {
                ...m,
                candidates: m.candidates.map(c => {
                    if (c.id !== candidateId) return c;
                    return { ...c, votes: c.votes + 1 };
                })
            };
        }));
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Cinema Meetings</h1>
                <button className="btn btn-primary" onClick={() => alert("Create Meeting Modal would open here")}>
                    <Plus size={16} className="mr-2" /> Schedule Meeting
                </button>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {meetings.map((meeting) => (
                    <div key={meeting.id} className="glass-card" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                            <div style={{ background: 'hsl(var(--primary))', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center', minWidth: '60px' }}>
                                <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    {new Date(meeting.date).getDate()}
                                </span>
                                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                    {new Date(meeting.date).toLocaleString('default', { month: 'short' })}
                                </span>
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.2rem' }}>
                                    {new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h3>
                                <span style={{
                                    fontSize: '0.8rem',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '1rem',
                                    background: meeting.status === 'VOTING' ? 'hsl(var(--accent))' : 'hsl(var(--secondary))',
                                    color: '#fff',
                                    fontWeight: 'bold'
                                }}>
                                    {meeting.status}
                                </span>
                            </div>
                        </div>

                        {meeting.status === 'VOTING' && (
                            <div>
                                <h4 style={{ marginBottom: '1rem', opacity: 0.8 }}>Proposed Films</h4>
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    {meeting.candidates.map((candidate) => (
                                        <div key={candidate.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem' }}>
                                            <div>
                                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{candidate.film.title}</span>
                                                <span style={{ marginLeft: '0.5rem', opacity: 0.6 }}>({candidate.film.year})</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{candidate.votes} votes</span>
                                                <button className="btn btn-ghost" onClick={() => handleVote(meeting.id, candidate.id)} style={{ color: 'hsl(var(--primary))' }}>
                                                    <ThumbsUp size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button className="btn btn-ghost" style={{ width: '100%', border: '1px dashed rgba(255,255,255,0.2)' }} onClick={() => alert("Propose from wishlist")}>
                                        + Propose a film
                                    </button>
                                </div>
                            </div>
                        )}

                        {meeting.status === 'PLANNING' && (
                            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                                <p>Voting has not started yet.</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
