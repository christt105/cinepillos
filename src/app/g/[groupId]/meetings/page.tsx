"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ThumbsUp, Plus, Trash2, User, Trophy } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import DateTimePicker from "@/components/DateTimePicker";
import clsx from "clsx";
import styles from "./meetings.module.css";

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

interface ProposedFilm {
    id: string;
    title: string;
    releaseDate: string | null;
}

interface Proposal {
    id: string;
    film: ProposedFilm;
}

export default function MeetingsPage() {
    const { data: session } = useSession();
    const { groupId } = useParams<{ groupId: string }>();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    // State for candidate selection
    const [proposedFilms, setProposedFilms] = useState<ProposedFilm[]>([]);
    const [showAddModal, setShowAddModal] = useState<string | null>(null); // meetingId
    const [showDateModal, setShowDateModal] = useState(false);
    const [newMeetingDate, setNewMeetingDate] = useState<Date>(new Date());

    const fetchMeetings = async () => {
        try {
            const res = await fetch(`/api/groups/${groupId}/meetings`);
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
        const res = await fetch(`/api/groups/${groupId}/proposals`);
        if (res.ok) {
            const data = await res.json();
            // Filter unique films
            const uniqueFilms = new Map<string, ProposedFilm>();
            (data as Proposal[]).forEach(proposal => {
                if (!uniqueFilms.has(proposal.film.id)) {
                    uniqueFilms.set(proposal.film.id, proposal.film);
                }
            });
            setProposedFilms(Array.from(uniqueFilms.values()));
        }
    };

    useEffect(() => {
        fetchMeetings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupId]);

    const handleVote = async (meetingId: string, candidateId: string) => {
        try {
            const res = await fetch(`/api/groups/${groupId}/vote`, {
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
        try {
            const res = await fetch(`/api/groups/${groupId}/meetings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: newMeetingDate.toISOString() })
            });

            if (res.ok) {
                setShowDateModal(false);
                setNewMeetingDate(new Date());
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
            const res = await fetch(`/api/groups/${groupId}/meetings/${meetingId}/candidates`, {
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
        if (!confirm("¿Estás seguro de que quieres quitar esta propuesta?")) return;

        try {
            const res = await fetch(`/api/groups/${groupId}/meetings/${meetingId}/candidates/${candidateId}`, {
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
        if (!confirm("¿Estás seguro de que quieres finalizar la votación? No se puede deshacer.")) return;

        try {
            const res = await fetch(`/api/groups/${groupId}/meetings/${meetingId}/conclude`, {
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
        return <div className={clsx("container", styles.loading)}>Cargando reuniones...</div>;
    }

    return (
        <div className="page page-narrow">
            <header className={styles.header}>
                <h1>Sesiones de Cine</h1>
                <button className="btn btn-primary" onClick={() => setShowDateModal(true)}>
                    <Plus size={16} /> Programar Reunión
                </button>
            </header>

            {/* Date Selection Modal */}
            {showDateModal && (
                <div className="modal-overlay" onClick={() => setShowDateModal(false)}>
                    <div className="glass-card modal" onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Programar Sesión</h3>
                        <DateTimePicker value={newMeetingDate} onChange={setNewMeetingDate} />
                        <div className={styles.modalActions}>
                            <button className="btn btn-ghost" onClick={() => setShowDateModal(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleCreateMeeting}>Programar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.list}>
                {meetings.length === 0 ? (
                    <div className={clsx("glass-card", styles.empty)}>
                        <CalendarIcon size={48} className={styles.emptyIcon} />
                        <p>No hay sesiones programadas.</p>
                        <button className={clsx("btn btn-ghost", styles.emptyAction)} onClick={() => setShowDateModal(true)}>
                            Programar Una
                        </button>
                    </div>
                ) : (
                    meetings.map((meeting) => (
                        <div key={meeting.id} className={clsx("glass-card", styles.meeting)}>
                            <div className={styles.meetingHeader}>
                                <div className={styles.dateBadge}>
                                    <span className={styles.dateDay}>
                                        {new Date(meeting.date).getDate()}
                                    </span>
                                    <span className={styles.dateMonth}>
                                        {new Date(meeting.date).toLocaleString('default', { month: 'short' })}
                                    </span>
                                </div>
                                <div className={styles.meetingInfo}>
                                    <h3 className={styles.meetingDate}>
                                        {new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        {' '}{new Date(meeting.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </h3>
                                    <div className={styles.meetingMeta}>
                                        <span className={clsx(styles.status, meeting.status === 'VOTING' && styles.statusVoting)}>
                                            {meeting.status}
                                        </span>
                                        {meeting.status === 'VOTING' && (
                                            <button
                                                className={clsx("btn btn-ghost", styles.smallAction)}
                                                onClick={() => handleConcludeVoting(meeting.id)}
                                            >
                                                Finalizar Votación
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {meeting.status === 'VOTING' && (
                                <div>
                                    <h4 className={styles.candidatesTitle}>Películas Propuestas</h4>
                                    <div className={styles.candidates}>
                                        {meeting.candidates.map((candidate) => (
                                            <div key={candidate.id} className={styles.candidate}>
                                                <div>
                                                    <div className={styles.candidateTitle}>
                                                        <span className={styles.filmName}>{candidate.film.title}</span>
                                                        <span className={styles.filmYear}>
                                                            ({candidate.film.releaseDate ? new Date(candidate.film.releaseDate).getFullYear() : 'N/A'})
                                                        </span>
                                                    </div>
                                                    <div className={styles.proposer}>
                                                        <User size={14} />
                                                        <span>Propuesta por {candidate.user?.name || "Desconocido"}</span>
                                                    </div>
                                                </div>
                                                <div className={styles.candidateActions}>
                                                    <span className={styles.voteCount}>{candidate.votes.length} votos</span>

                                                    <button className={clsx("btn btn-ghost", styles.voteButton)} onClick={() => handleVote(meeting.id, candidate.id)}>
                                                        <ThumbsUp size={18} />
                                                    </button>

                                                    {candidate.userId === session?.user?.id && (
                                                        <button className={clsx("btn btn-ghost", styles.removeButton)} onClick={() => handleRemoveCandidate(meeting.id, candidate.id)}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {showAddModal === meeting.id ? (
                                            <div className={styles.picker}>
                                                <div className={styles.pickerHeader}>
                                                    <h5>Elige película a proponer:</h5>
                                                    <button onClick={() => setShowAddModal(null)} className={clsx("btn btn-ghost", styles.smallAction)}>Cerrar</button>
                                                </div>
                                                <div className={styles.pickerList}>
                                                    {proposedFilms.map(film => (
                                                        <button
                                                            key={film.id}
                                                            className={clsx("btn btn-ghost", styles.pickerOption)}
                                                            onClick={() => handleAddCandidate(meeting.id, film.id)}
                                                        >
                                                            <span>{film.title}</span>
                                                        </button>
                                                    ))}
                                                    {proposedFilms.length === 0 && <p className={styles.pickerEmpty}>No se encontraron propuestas.</p>}
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                className="btn btn-ghost btn-dashed"
                                                onClick={() => openAddModal(meeting.id)}
                                            >
                                                + Proponer película
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {meeting.status === 'PLANNING' && (
                                <div className={styles.pending}>
                                    <p>La votación aún no ha comenzado.</p>
                                </div>
                            )}

                            {meeting.status === 'CONCLUDED' && (
                                <div className={styles.concluded}>
                                    <Trophy size={48} className={styles.trophy} />
                                    <h3>¡Ganador Seleccionado!</h3>
                                    {(() => {
                                        const winner = meeting.candidates.find(c => c.film.id === meeting.selectedFilmId);
                                        return winner ? (
                                            <div className={styles.winner}>
                                                <h2 className={styles.winnerTitle}>{winner.film.title}</h2>
                                                <p className={styles.winnerProposer}>Propuesta por {winner.user?.name || "Desconocido"}</p>
                                                <p className={styles.winnerVotes}>{winner.votes.length} votos</p>
                                            </div>
                                        ) : (
                                            <p>No hay ganador (Empate o sin votos)</p>
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
