import { prisma } from "@/lib/prisma";
import { requireGroupPage } from "@/lib/group-page";
import Link from "next/link";
import { Plus } from "lucide-react";
import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { recentMeetingCutoff } from "@/lib/meetings";
import { avatarUrl } from "@/lib/avatar";
import { sortByLikes } from "@/lib/proposals";
import ScheduleMeetingButton from "@/components/ScheduleMeetingButton";
import ProposalLikeButton from "@/components/ProposalLikeButton";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";

export default async function GroupHome({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const format = await getFormatter();
  const { session } = await requireGroupPage(groupId);

  // Fetch Next Meeting (or recently concluded), including one still in
  // PLANNING, which has no date to filter or sort by yet.
  const nextMeeting = await prisma.meeting.findFirst({
    where: {
      OR: [
        { date: { gt: recentMeetingCutoff() } }, // Show meetings from last 24h to keep concluded ones visible
        { date: null }
      ],
      groupId
    },
    orderBy: { date: { sort: 'asc', nulls: 'last' } },
    include: {
      candidates: {
        include: {
          film: {
            include: {
              proposals: {
                where: { groupId },
                include: { user: true }
              }
            }
          }
        }
      }
    }
  });

  // Films the group already watched: they won a meeting that is now concluded.
  const concludedMeetings = await prisma.meeting.findMany({
    where: { groupId, status: 'CONCLUDED', selectedFilmId: { not: null } },
    select: { selectedFilmId: true }
  });
  const watchedFilmIds = concludedMeetings.flatMap(meeting => meeting.selectedFilmId ?? []);

  // Fetch Proposals (Films with Proposals, most liked first). Likes hang off a
  // proposal, so a film card acts on the group's first proposal of that film.
  const proposedFilms = await prisma.film.findMany({
    where: {
      proposals: { some: { groupId } },
      ...(watchedFilmIds.length > 0 ? { NOT: { id: { in: watchedFilmIds } } } : {})
    },
    orderBy: { createdAt: 'desc' },
    include: {
      proposals: {
        where: { groupId },
        orderBy: { createdAt: 'asc' },
        include: {
          user: true,
          _count: { select: { likes: true } },
          likes: { where: { userId: session.user.id }, select: { id: true } }
        }
      }
    }
  });

  const filmsWithProposals = sortByLikes(proposedFilms);

  return (
    <div className="page">
      {/* Hero / Next Session */}
      <section className={styles.section}>
        <h2 className="section-title">{t("nextSession")}</h2>
        {nextMeeting ? (
          <div className={`glass-card ${styles.hero}`}>
            <div className={styles.heroContent}>
              <h3 className={styles.heroDate}>
                {nextMeeting.date
                  ? format.dateTime(new Date(nextMeeting.date), { weekday: 'long', day: 'numeric', month: 'long' })
                  : t("noDate")}
              </h3>
              <p className={styles.heroStatus}>{t("status", { status: nextMeeting.status })}</p>

              {/* Status: VOTING */}
              {nextMeeting.status === 'VOTING' && (
                <div>
                  <h4 className={styles.heroSubtitle}>{t("voteNext")}</h4>
                  <div className="responsive-proposals">
                    {nextMeeting.candidates.map(candidate => {
                      // Use original proposers
                      const proposers = candidate.film.proposals.map(p => p.user);
                      const mainProposer = proposers[0];

                      return (
                        <div key={candidate.id} className={`proposal-card glass-card ${styles.candidate}`}>
                          <div className="poster">
                            <Image
                              src={`https://image.tmdb.org/t/p/w500${candidate.film.posterPath}`}
                              alt={candidate.film.title}
                              fill
                              className="poster-image"
                            />
                          </div>
                          <h4 className="poster-title">{candidate.film.title}</h4>
                          <div className="poster-meta">
                            {mainProposer && (
                              <div className={`avatar ${styles.miniAvatar}`}>
                                <Image src={avatarUrl(mainProposer)} alt={mainProposer.name || 'User'} fill className="poster-image" />
                              </div>
                            )}
                            <span>{mainProposer?.name || tCommon("unknownUser")}</span>
                            {proposers.length > 1 && <span className={styles.extraProposers}>+{proposers.length - 1}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.heroActions}>
                    <Link href={`/g/${groupId}/meetings`} className="btn btn-primary">
                      {t("goToVotingRoom")}
                    </Link>
                  </div>
                </div>
              )}

              {/* Status: CONCLUDED */}
              {nextMeeting.status === 'CONCLUDED' && (
                <div>
                  <h4 className={styles.winnerTitle}>{t("winnerTitle")}</h4>
                  {(() => {
                    const winnerCandidate = nextMeeting.candidates.find(c => c.filmId === nextMeeting.selectedFilmId);
                    if (winnerCandidate) {
                      const proposers = winnerCandidate.film.proposals.map(p => p.user);
                      const mainProposer = proposers[0];

                      return (
                        <div className={styles.winner}>
                          <div className={styles.winnerPoster}>
                            <Image
                              src={`https://image.tmdb.org/t/p/w500${winnerCandidate.film.posterPath}`}
                              alt={winnerCandidate.film.title}
                              width={200}
                              height={300}
                              className={styles.winnerPosterImage}
                            />
                          </div>
                          <div className={styles.winnerBody}>
                            <h1 className={styles.winnerFilm}>{winnerCandidate.film.title}</h1>
                            <p className={styles.winnerOverview}>{winnerCandidate.film.overview.slice(0, 150)}...</p>

                            <div className={styles.winnerProposer}>
                              <span className={styles.proposerLabel}>{t("proposedBy")}</span>
                              {mainProposer && (
                                <Image src={avatarUrl(mainProposer)} alt={mainProposer.name || ''} width={24} height={24} className={styles.proposerAvatar} />
                              )}
                              <span className={styles.proposerName}>{mainProposer?.name}</span>
                              {proposers.length > 1 && <span className={styles.extraProposers}>{t("extraProposers", { count: proposers.length - 1 })}</span>}
                            </div>

                            <Link href={`/g/${groupId}/movies/${winnerCandidate.film.tmdbId}`} className="btn btn-primary">
                              {t("viewDetails")}
                            </Link>
                          </div>
                        </div>
                      );
                    }
                    return <p>{t("noWinnerYet")}</p>;
                  })()}
                </div>
              )}

              {/* Status: PLANNING (Default) */}
              {(nextMeeting.status === 'PLANNING' || !nextMeeting.status) && (
                <div>
                  <p className={styles.planningCount}>
                    {t("planningCount", { count: nextMeeting.candidates.length })}
                  </p>
                  <div className={styles.heroActions}>
                    <ScheduleMeetingButton groupId={groupId} meetingId={nextMeeting.id} />
                    <Link href={`/g/${groupId}/meetings`} className="btn btn-ghost">
                      {t("proposeFilms")}
                    </Link>
                  </div>
                </div>
              )}

            </div>
            {/* Background art */}
            <div className={styles.heroBackdrop} />
            {/* Dynamic background if winner or candidates */}
            {nextMeeting.candidates.length > 0 && (
              <div className={styles.heroArt}>
                <Image
                  src={`https://image.tmdb.org/t/p/original${nextMeeting.status === 'CONCLUDED' && nextMeeting.selectedFilmId
                    ? nextMeeting.candidates.find(c => c.filmId === nextMeeting.selectedFilmId)?.film.posterPath
                    : nextMeeting.candidates[0]?.film.posterPath}`}
                  alt="Background"
                  fill
                  className={styles.heroArtImage}
                />
              </div>
            )}
          </div>
        ) : (
          <div className={`glass-card ${styles.emptyCard}`}>
            <p className={styles.emptyText}>{t("noSessions")}</p>
            <Link href={`/g/${groupId}/meetings`} className="btn btn-ghost">{t("scheduleOne")}</Link>
          </div>
        )}
      </section>

      {/* Proposals Row */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.headerTitle}>{t("proposalsTitle")}</h2>
          <Link href={`/g/${groupId}/search`} className="btn btn-ghost">
            <Plus size={16} /> {t("addNew")}
          </Link>
        </div>

        {filmsWithProposals.length > 0 ? (
          <div className="responsive-proposals">
            {filmsWithProposals.map((film) => {
              const mainProposal = film.proposals[0];

              return (
                <div key={film.id} className="proposal-card">
                  <Link href={`/g/${groupId}/movies/${film.tmdbId}`}>
                    <div className="poster">
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${film.posterPath}`}
                        alt={film.title}
                        fill
                        className="poster-image"
                      />
                    </div>
                    <h4 className="poster-title">{film.title}</h4>
                  </Link>
                  <div className={styles.proposalFooter}>
                    <div className={styles.proposerStack}>
                      {film.proposals.slice(0, 3).map((proposal) => (
                        <div key={proposal.id} className={`avatar ${styles.stackAvatar}`}>
                          <Image src={avatarUrl(proposal.user)} alt={proposal.user.name || ''} fill className="poster-image" />
                        </div>
                      ))}
                      {film.proposals.length > 3 && (
                        <span className={styles.stackMore}>+{film.proposals.length - 3}</span>
                      )}
                    </div>
                    {mainProposal && (
                      <ProposalLikeButton
                        groupId={groupId}
                        proposalId={mainProposal.id}
                        initialCount={mainProposal._count.likes}
                        initialLiked={mainProposal.likes.length > 0}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyProposals}>
            <p className={styles.emptyProposalsText}>{t("noProposals")}</p>
            <Link href={`/g/${groupId}/search`} className="btn btn-primary">{t("startProposing")}</Link>
          </div>
        )}
      </section>

    </div>
  );
}
