"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ThumbsUp, Plus, Trash2, User, Trophy } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useFormatter, useTranslations } from "next-intl";
import DateTimePicker from "@/components/DateTimePicker";
import ScheduleMeetingButton from "@/components/ScheduleMeetingButton";
import MeetingFilmSearch from "./MeetingFilmSearch";
import ProposalLikeButton from "@/components/ProposalLikeButton";
import { TMDBMovie } from "@/lib/tmdb";
import clsx from "clsx";
import styles from "./meetings.module.css";

interface Meeting {
    id: string;
    date: string | null;
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
    _count: { likes: number };
    likes: { id: string }[];
}

/// One entry per film: the group's first proposal of it carries the likes.
interface ProposedFilmOption {
    film: ProposedFilm;
    proposalId: string;
    likeCount: number;
    liked: boolean;
}

export default function MeetingsPage() {
    const t = useTranslations("meetings");
    const tCommon = useTranslations("common");
    const tSchedule = useTranslations("schedule");
    const format = useFormatter();
    const { data: session } = useSession();
    const { groupId } = useParams<{ groupId: string }>();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    // State for candidate selection
    const [proposedFilms, setProposedFilms] = useState<ProposedFilmOption[]>([]);
    const [showAddModal, setShowAddModal] = useState<string | null>(null); // meetingId
    const [pickerTab, setPickerTab] = useState<"proposals" | "search">("proposals");
    const [proposingId, setProposingId] = useState<number | null>(null);
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
            const uniqueFilms = new Map<string, ProposedFilmOption>();
            (data as Proposal[]).forEach(proposal => {
                if (!uniqueFilms.has(proposal.film.id)) {
                    uniqueFilms.set(proposal.film.id, {
                        film: proposal.film,
                        proposalId: proposal.id,
                        likeCount: proposal._count.likes,
                        liked: proposal.likes.length > 0,
                    });
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
                alert(t("errorVote"));
            }
        } catch (error) {
            console.error("Vote failed", error);
        }
    };

    /** Without a date the meeting is created in PLANNING, still undated. */
    const handleCreateMeeting = async (date: Date | null) => {
        try {
            const res = await fetch(`/api/groups/${groupId}/meetings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: date ? date.toISOString() : null })
            });

            if (res.ok) {
                setShowDateModal(false);
                setNewMeetingDate(new Date());
                fetchMeetings();
            } else {
                alert(t("errorCreate"));
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
                alert(data.error || t("errorAddCandidate"));
            }
        } catch (error) {
            console.error("Add candidate failed", error);
        }
    };

    const handleRemoveCandidate = async (meetingId: string, candidateId: string) => {
        if (!confirm(t("confirmRemoveCandidate"))) return;

        try {
            const res = await fetch(`/api/groups/${groupId}/meetings/${meetingId}/candidates/${candidateId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                fetchMeetings();
            } else {
                const data = await res.json();
                alert(data.error || t("errorRemoveCandidate"));
            }
        } catch (error) {
            console.error("Remove candidate failed", error);
        }
    };

    const handleConcludeVoting = async (meetingId: string) => {
        if (!confirm(t("confirmConclude"))) return;

        try {
            const res = await fetch(`/api/groups/${groupId}/meetings/${meetingId}/conclude`, {
                method: "PATCH"
            });

            if (res.ok) {
                fetchMeetings();
            } else {
                const data = await res.json();
                alert(data.error || t("errorConclude"));
            }
        } catch (error) {
            console.error("Conclude voting failed", error);
        }
    };

    /**
     * Proposes a film found on TMDB and promotes it to candidate of the meeting
     * in a single action, so nobody has to walk through `/search` and back.
     */
    const handleProposeAndAdd = async (meetingId: string, movie: TMDBMovie) => {
        if (proposingId === movie.id) return;
        setProposingId(movie.id);

        try {
            const proposalRes = await fetch(`/api/groups/${groupId}/proposals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tmdbId: movie.id,
                    title: movie.title,
                    overview: movie.overview,
                    posterPath: movie.poster_path,
                    releaseDate: movie.release_date
                })
            });

            if (!proposalRes.ok) {
                alert(t("errorPropose"));
                return;
            }

            const proposal = await proposalRes.json();
            await handleAddCandidate(meetingId, proposal.filmId);
        } catch (error) {
            console.error("Propose from meeting failed", error);
        } finally {
            setProposingId(null);
        }
    };

    const openAddModal = (meetingId: string) => {
        setShowAddModal(meetingId);
        setPickerTab("proposals");
        fetchProposedFilms();
    };

    if (loading) {
        return <div className={clsx("container", styles.loading)}>{t("loading")}</div>;
    }

    return (
        <div className="page page-narrow">
            <header className={styles.header}>
                <h1>{t("pageTitle")}</h1>
                <div className={styles.headerActions}>
                    <button className="btn btn-ghost" onClick={() => handleCreateMeeting(null)}>
                        <Plus size={16} /> {t("openPlanning")}
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowDateModal(true)}>
                        <Plus size={16} /> {t("scheduleMeeting")}
                    </button>
                </div>
            </header>

            {/* Date Selection Modal */}
            {showDateModal && (
                <div className="modal-overlay" onClick={() => setShowDateModal(false)}>
                    <div className="glass-card modal" onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>{tSchedule("title")}</h3>
                        <DateTimePicker value={newMeetingDate} onChange={setNewMeetingDate} />
                        <div className={styles.modalActions}>
                            <button className="btn btn-ghost" onClick={() => setShowDateModal(false)}>{tCommon("cancel")}</button>
                            <button className="btn btn-primary" onClick={() => handleCreateMeeting(newMeetingDate)}>{tSchedule("action")}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.list}>
                {meetings.length === 0 ? (
                    <div className={clsx("glass-card", styles.empty)}>
                        <CalendarIcon size={48} className={styles.emptyIcon} />
                        <p>{t("noMeetings")}</p>
                        <button className={clsx("btn btn-ghost", styles.emptyAction)} onClick={() => setShowDateModal(true)}>
                            {t("scheduleOne")}
                        </button>
                    </div>
                ) : (
                    meetings.map((meeting) => (
                        <div key={meeting.id} className={clsx("glass-card", styles.meeting)}>
                            <div className={styles.meetingHeader}>
                                <div className={clsx(styles.dateBadge, !meeting.date && styles.dateBadgeUndated)}>
                                    {meeting.date ? (
                                        <>
                                            <span className={styles.dateDay}>
                                                {new Date(meeting.date).getDate()}
                                            </span>
                                            <span className={styles.dateMonth}>
                                                {format.dateTime(new Date(meeting.date), { month: 'short' })}
                                            </span>
                                        </>
                                    ) : (
                                        <CalendarIcon size={24} />
                                    )}
                                </div>
                                <div className={styles.meetingInfo}>
                                    <h3 className={styles.meetingDate}>
                                        {meeting.date ? (
                                            <>
                                                {format.dateTime(new Date(meeting.date), {
                                                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                                                })}
                                                {' '}{format.dateTime(new Date(meeting.date), { hour: '2-digit', minute: '2-digit' })}
                                            </>
                                        ) : t("noDate")}
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
                                                {t("concludeVoting")}
                                            </button>
                                        )}
                                        {meeting.status === 'PLANNING' && (
                                            <ScheduleMeetingButton
                                                groupId={groupId}
                                                meetingId={meeting.id}
                                                className={styles.smallAction}
                                                onScheduled={fetchMeetings}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {(meeting.status === 'VOTING' || meeting.status === 'PLANNING') && (
                                <div>
                                    {meeting.status === 'PLANNING' && (
                                        <p className={styles.pending}>{t("planningHint")}</p>
                                    )}
                                    <h4 className={styles.candidatesTitle}>{t("candidatesTitle")}</h4>
                                    <div className={styles.candidates}>
                                        {meeting.candidates.map((candidate) => (
                                            <div key={candidate.id} className={styles.candidate}>
                                                <div>
                                                    <div className={styles.candidateTitle}>
                                                        <span className={styles.filmName}>{candidate.film.title}</span>
                                                        <span className={styles.filmYear}>
                                                            ({candidate.film.releaseDate ? new Date(candidate.film.releaseDate).getFullYear() : tCommon("notAvailable")})
                                                        </span>
                                                    </div>
                                                    <div className={styles.proposer}>
                                                        <User size={14} />
                                                        <span>{t("proposedBy", { name: candidate.user?.name || tCommon("unknownUser") })}</span>
                                                    </div>
                                                </div>
                                                <div className={styles.candidateActions}>
                                                    {meeting.status === 'VOTING' && (
                                                        <>
                                                            <span className={styles.voteCount}>{t("votes", { count: candidate.votes.length })}</span>

                                                            <button className={clsx("btn btn-ghost", styles.voteButton)} onClick={() => handleVote(meeting.id, candidate.id)}>
                                                                <ThumbsUp size={18} />
                                                            </button>
                                                        </>
                                                    )}

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
                                                    <h5>{t("pickerTitle")}</h5>
                                                    <button onClick={() => setShowAddModal(null)} className={clsx("btn btn-ghost", styles.smallAction)}>{tCommon("close")}</button>
                                                </div>
                                                <div className={styles.pickerTabs}>
                                                    <button
                                                        className={clsx("btn", pickerTab === "proposals" ? "btn-primary" : "btn-ghost")}
                                                        onClick={() => setPickerTab("proposals")}
                                                    >
                                                        {t("tabProposals")}
                                                    </button>
                                                    <button
                                                        className={clsx("btn", pickerTab === "search" ? "btn-primary" : "btn-ghost")}
                                                        onClick={() => setPickerTab("search")}
                                                    >
                                                        {t("tabSearch")}
                                                    </button>
                                                </div>

                                                {pickerTab === "proposals" ? (
                                                    <div className={styles.pickerList}>
                                                        {proposedFilms.map(option => (
                                                            <div key={option.film.id} className={styles.pickerRow}>
                                                                <button
                                                                    className={clsx("btn btn-ghost", styles.pickerOption)}
                                                                    onClick={() => handleAddCandidate(meeting.id, option.film.id)}
                                                                >
                                                                    <span>{option.film.title}</span>
                                                                </button>
                                                                <ProposalLikeButton
                                                                    groupId={groupId}
                                                                    proposalId={option.proposalId}
                                                                    initialCount={option.likeCount}
                                                                    initialLiked={option.liked}
                                                                />
                                                            </div>
                                                        ))}
                                                        {proposedFilms.length === 0 && <p className={styles.pickerEmpty}>{t("noProposalsFound")}</p>}
                                                    </div>
                                                ) : (
                                                    <MeetingFilmSearch
                                                        groupId={groupId}
                                                        proposingId={proposingId}
                                                        onPropose={movie => handleProposeAndAdd(meeting.id, movie)}
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                className="btn btn-ghost btn-dashed"
                                                onClick={() => openAddModal(meeting.id)}
                                            >
                                                {t("addFilm")}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {meeting.status === 'CONCLUDED' && (
                                <div className={styles.concluded}>
                                    <Trophy size={48} className={styles.trophy} />
                                    <h3>{t("concludedTitle")}</h3>
                                    {(() => {
                                        const winner = meeting.candidates.find(c => c.film.id === meeting.selectedFilmId);
                                        return winner ? (
                                            <div className={styles.winner}>
                                                <h2 className={styles.winnerTitle}>{winner.film.title}</h2>
                                                <p className={styles.winnerProposer}>{t("proposedBy", { name: winner.user?.name || tCommon("unknownUser") })}</p>
                                                <p className={styles.winnerVotes}>{t("votes", { count: winner.votes.length })}</p>
                                            </div>
                                        ) : (
                                            <p>{t("noWinner")}</p>
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
