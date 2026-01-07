"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ThumbsUp, Plus, Trash2, User, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface Meeting {
    id: string;
    date: string;
    status: string;
    selectedFilmId: string | null;
    candidates: Candidate[];
}

interface Candidate {
    id: string;
    userId: string;
    film: {
        id: string;
        title: string;
        releaseDate: string | null;
    };
    user?: {
        name: string | null;
        image: string | null;
    };
    votes: Vote[];
    _count?: { votes: number };
}

interface Vote {
    userId: string;
}

export default function MeetingsPage() {
    const { data: session } = useSession();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    // State for candidate selection
    const [proposedFilms, setProposedFilms] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState<string | null>(null); // meetingId
    const [showDateModal, setShowDateModal] = useState(false);
    const [newMeetingDate, setNewMeetingDate] = useState("");

    const router = useRouter();

    const fetchMeetings = async () => {
        try {
            const res = await fetch("/api/meetings");
            if (res.ok) {
                const data = await res.json();
                setMeetings(data);
            }
        } catch (error) {
            console.error("Failed to fetch meetings", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProposedFilms = async () => {
        const res = await fetch("/api/proposals");
        if (res.ok) {
            const data = await res.json();
            // Filter unique films
            const uniqueFilms = new Map();
            data.forEach((p: any) => {
                if (!uniqueFilms.has(p.film.id)) {
                    uniqueFilms.set(p.film.id, p.film);
                }
            });
            setProposedFilms(Array.from(uniqueFilms.values()));
        }
    };

    useEffect(() => {
        fetchMeetings();
    }, []);

    const handleVote = async (meetingId: string, candidateId: string) => {
        try {
            const res = await fetch("/api/meetings/vote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ candidateId })
            });

            if (res.ok) {
                fetchMeetings(); // Refresh to show updated votes
            } else {
                alert("Failed to vote");
            }
        } catch (error) {
            console.error("Vote failed", error);
        }
    };

    const handleCreateMeeting = async () => {
        if (!newMeetingDate) return;

        try {
            const res = await fetch("/api/meetings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: new Date(newMeetingDate).toISOString() })
            });

            if (res.ok) {
                setShowDateModal(false);
                setNewMeetingDate("");
                fetchMeetings();
            } else {
                alert("Failed to create meeting");
            }
        } catch (error) {
            console.error("Create meeting failed", error);
        }
    };

    const handleAddCandidate = async (meetingId: string, filmId: string) => {
        try {
            const res = await fetch(`/api/meetings/${meetingId}/candidates`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filmId })
            });

            if (res.ok) {
                fetchMeetings();
                setShowAddModal(null);
            } else {
                const data = await res.json();
                alert(data.error || "Failed to add candidate");
            }
        } catch (error) {
            console.error("Add candidate failed", error);
        }
    };

    const handleRemoveCandidate = async (meetingId: string, candidateId: string) => {
        if (!confirm("Are you sure you want to remove this proposal?")) return;

        try {
            const res = await fetch(`/api/meetings/${meetingId}/candidates/${candidateId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                fetchMeetings();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to remove candidate");
            }
        } catch (error) {
            console.error("Remove candidate failed", error);
        }
    };

    const handleConcludeVoting = async (meetingId: string) => {
        if (!confirm("Are you sure you want to conclude voting? This cannot be undone.")) return;

        try {
            const res = await fetch(`/api/meetings/${meetingId}/conclude`, {
                method: "PATCH"
            });

            if (res.ok) {
                fetchMeetings();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to conclude voting");
            }
        } catch (error) {
            console.error("Conclude voting failed", error);
        }
    };

    const openAddModal = (meetingId: string) => {
        setShowAddModal(meetingId);
        fetchProposedFilms();
    };

    if (loading) {
        return <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>Loading meetings...</div>;
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Cinema Meetings</h1>
                <button className="btn btn-primary" onClick={() => setShowDateModal(true)}>
                    <Plus size={16} style={{ marginRight: '0.5rem' }} /> Schedule Meeting
                </button>
            </header>

            {/* Date Selection Modal */}
            {showDateModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }} onClick={() => setShowDateModal(false)}>
                    <div className="glass-card" style={{ padding: '2rem', minWidth: '300px' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '1rem' }}>Select Date</h3>
                        <input
                            type="datetime-local"
                            className="input"
                            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '0.5rem' }}
                            value={newMeetingDate}
                            onChange={(e) => setNewMeetingDate(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setShowDateModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreateMeeting} disabled={!newMeetingDate}>Schedule</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {meetings.length === 0 ? (
                    <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', opacity: 0.7 }}>
                        <CalendarIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p>No upcoming meetings scheduled.</p>
                        <button className="btn btn-ghost" onClick={() => setShowDateModal(true)} style={{ marginTop: '1rem' }}>
                            Schedule One Now
                        </button>
                    </div>
                ) : (
                    meetings.map((meeting) => (
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
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1.2rem' }}>
                                        {new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        {' '}{new Date(meeting.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.2rem' }}>
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
                                        {meeting.status === 'VOTING' && (
                                            <button
                                                className="btn btn-ghost"
                                                style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', opacity: 0.7 }}
                                                onClick={() => handleConcludeVoting(meeting.id)}
                                            >
                                                Conclude Voting
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {meeting.status === 'VOTING' && (
                                <div>
                                    <h4 style={{ marginBottom: '1rem', opacity: 0.8 }}>Proposed Films</h4>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {meeting.candidates.map((candidate) => (
                                            <div key={candidate.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.5rem' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{candidate.film.title}</span>
                                                        <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>
                                                            ({candidate.film.releaseDate ? new Date(candidate.film.releaseDate).getFullYear() : 'N/A'})
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', opacity: 0.7, fontSize: '0.8rem' }}>
                                                        <User size={14} />
                                                        <span>Proposed by {candidate.user?.name || "Unknown"}</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{candidate.votes.length} votes</span>

                                                    <button className="btn btn-ghost" onClick={() => handleVote(meeting.id, candidate.id)} style={{ color: 'hsl(var(--primary))' }}>
                                                        <ThumbsUp size={18} />
                                                    </button>

                                                    {candidate.userId === session?.user?.id && (
                                                        <button className="btn btn-ghost" onClick={() => handleRemoveCandidate(meeting.id, candidate.id)} style={{ color: '#ef4444' }}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {showAddModal === meeting.id ? (
                                            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                    <h5>Select a film to propose:</h5>
                                                    <button onClick={() => setShowAddModal(null)} className="btn btn-ghost" style={{ padding: '0.2rem' }}>Close</button>
                                                </div>
                                                <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                                    {proposedFilms.map(film => (
                                                        <button
                                                            key={film.id}
                                                            className="btn btn-ghost"
                                                            style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                                                            onClick={() => handleAddCandidate(meeting.id, film.id)}
                                                        >
                                                            <span>{film.title}</span>
                                                        </button>
                                                    ))}
                                                    {proposedFilms.length === 0 && <p style={{ opacity: 0.5 }}>No proposals found.</p>}
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                className="btn btn-ghost"
                                                style={{ width: '100%', border: '1px dashed rgba(255,255,255,0.2)' }}
                                                onClick={() => openAddModal(meeting.id)}
                                            >
                                                + Propose a film
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {meeting.status === 'PLANNING' && (
                                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                                    <p>Voting has not started yet.</p>
                                </div>
                            )}

                            {meeting.status === 'CONCLUDED' && (
                                <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem' }}>
                                    <Trophy size={48} style={{ color: 'gold', marginBottom: '1rem' }} />
                                    <h3>Winner Selected!</h3>
                                    {(() => {
                                        const winner = meeting.candidates.find(c => c.film.id === meeting.selectedFilmId);
                                        return winner ? (
                                            <div style={{ marginTop: '1rem' }}>
                                                <h2 style={{ fontSize: '1.5rem', color: 'hsl(var(--primary))' }}>{winner.film.title}</h2>
                                                <p style={{ opacity: 0.7 }}>Proposed by {winner.user?.name || "Unknown"}</p>
                                                <p style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>{winner.votes.length} votes</p>
                                            </div>
                                        ) : (
                                            <p>No winner selected (Tie or no votes)</p>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
