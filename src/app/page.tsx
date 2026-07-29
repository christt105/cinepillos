import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import Image from "next/image";

// Force dynamic to ensure we check session
export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const activeFamilyId = session.user?.activeFamilyId;

  // Fetch Next Meeting (or recently concluded)
  const nextMeeting = activeFamilyId ? await prisma.meeting.findFirst({
    where: {
      date: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Show meetings from last 24h to keep concluded ones visible
      familyId: activeFamilyId
    },
    orderBy: { date: 'asc' },
    include: {
      candidates: {
        include: {
          film: {
            include: {
              proposals: {
                where: { familyId: activeFamilyId },
                include: { user: true }
              }
            }
          }
        }
      }
    }
  }) : null;

  // Fetch Proposals (Recent Films with Proposals)
  const filmsWithProposals = activeFamilyId ? await prisma.film.findMany({
    where: { proposals: { some: { familyId: activeFamilyId } } },
    orderBy: { createdAt: 'desc' },
    include: { proposals: { where: { familyId: activeFamilyId }, include: { user: true } } }
  }) : [];

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {!activeFamilyId && (
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
              <h2>¡Bienvenido!</h2>
              <p style={{ opacity: 0.8, marginTop: '1rem' }}>No tienes ningún grupo de cine activo.</p>
              <p style={{ opacity: 0.8 }}>Selecciona uno en el menú superior o pide a un administrador que te añada a uno.</p>
          </div>
      )}

      {/* Hero / Next Session */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#e5e5e5' }}>Próxima Sesión</h2>
        {nextMeeting ? (
          <div className="glass-card" style={{ padding: '2rem', borderRadius: '1rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 10 }}>
              <h3 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                {new Date(nextMeeting.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Estado: {nextMeeting.status}</p>

              {/* Status: VOTING */}
              {nextMeeting.status === 'VOTING' && (
                <div>
                  <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Vota por la próxima película:</h4>
                  <div className="responsive-proposals">
                    {nextMeeting.candidates.map(candidate => {
                      // Use original proposers
                      const proposers = candidate.film.proposals.map((p: any) => p.user);
                      const mainProposer = proposers[0];

                      return (
                        <div key={candidate.id} className="proposal-card glass-card" style={{ padding: '0.5rem' }}>
                          <div style={{ aspectRatio: '2/3', position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '0.5rem' }}>
                            <Image
                              src={`https://image.tmdb.org/t/p/w500${candidate.film.posterPath}`}
                              alt={candidate.film.title}
                              fill
                              style={{ objectFit: 'cover' }}
                            />
                          </div>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{candidate.film.title}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
                            {mainProposer?.image ? (
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', position: 'relative' }}>
                                <Image src={mainProposer.image} alt={mainProposer.name || 'User'} fill style={{ objectFit: 'cover' }} />
                              </div>
                            ) : (
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#555' }} />
                            )}
                            <span>{mainProposer?.name || 'Unknown'}</span>
                            {proposers.length > 1 && <span style={{ fontSize: '0.7em', opacity: 0.7 }}>+{proposers.length - 1}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '2rem' }}>
                    <Link href="/meetings" className="btn btn-primary">
                      Ir a la Sala de Votación
                    </Link>
                  </div>
                </div>
              )}

              {/* Status: CONCLUDED */}
              {nextMeeting.status === 'CONCLUDED' && (
                <div>
                  <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#ffd700' }}>Película Ganadora</h4>
                  {(() => {
                    const winnerCandidate = nextMeeting.candidates.find(c => c.filmId === nextMeeting.selectedFilmId);
                    if (winnerCandidate) {
                      const proposers = winnerCandidate.film.proposals.map((p: any) => p.user);
                      const mainProposer = proposers[0];

                      return (
                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                          <div style={{ flex: '0 0 200px', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                            <Image
                              src={`https://image.tmdb.org/t/p/w500${winnerCandidate.film.posterPath}`}
                              alt={winnerCandidate.film.title}
                              width={200}
                              height={300}
                              style={{ objectFit: 'cover' }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', lineHeight: 1.1, marginBottom: '0.5rem' }}>{winnerCandidate.film.title}</h1>
                            <p style={{ fontSize: '1.1rem', opacity: 0.8, marginBottom: '2rem', maxWidth: '600px' }}>{winnerCandidate.film.overview.slice(0, 150)}...</p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '2rem', width: 'fit-content' }}>
                              <span style={{ opacity: 0.7 }}>Propuesta por</span>
                              {mainProposer?.image && (
                                <Image src={mainProposer.image} alt={mainProposer.name || ''} width={24} height={24} style={{ borderRadius: '50%' }} />
                              )}
                              <span style={{ fontWeight: '600' }}>{mainProposer?.name}</span>
                              {proposers.length > 1 && <span style={{ fontSize: '0.8em', opacity: 0.7 }}>+{proposers.length - 1} others</span>}
                            </div>

                            <Link href={`/movies/${winnerCandidate.film.tmdbId}`} className="btn btn-primary">
                              Ver Detalles
                            </Link>
                          </div>
                        </div>
                      );
                    }
                    return <p>No se ha seleccionado ganador aún.</p>;
                  })()}
                </div>
              )}

              {/* Status: PLANNING (Default) */}
              {(nextMeeting.status === 'PLANNING' || !nextMeeting.status) && (
                <>
                  <Link href="/meetings" className="btn btn-primary">
                    Ir a la Sala de Votación
                  </Link>
                </>
              )}

            </div>
            {/* Background art */}
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 100%)', zIndex: 1 }} />
            {/* Dynamic background if winner or candidates */}
            {nextMeeting.candidates.length > 0 && (
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0, opacity: 0.3 }}>
                <Image
                  src={`https://image.tmdb.org/t/p/original${nextMeeting.status === 'CONCLUDED' && nextMeeting.selectedFilmId
                    ? nextMeeting.candidates.find(c => c.filmId === nextMeeting.selectedFilmId)?.film.posterPath
                    : nextMeeting.candidates[0]?.film.posterPath}`}
                  alt="Background"
                  fill
                  style={{ objectFit: 'cover', filter: 'blur(20px)' }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '2rem', borderRadius: '1rem', textAlign: 'center' }}>
            <p style={{ opacity: 0.6, marginBottom: '1rem' }}>No hay sesiones programadas.</p>
            <Link href="/meetings" className="btn btn-ghost">Programar Una</Link>
          </div>
        )}
      </section>

      {/* Proposals Row */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#e5e5e5' }}>Propuestas</h2>
          <Link href="/search" className="btn btn-ghost" style={{ fontSize: '0.9rem' }}>
            <Plus size={16} style={{ marginRight: 4 }} /> Añadir Nueva
          </Link>
        </div>

        {filmsWithProposals.length > 0 ? (
          <div className="responsive-proposals">
            {filmsWithProposals.map((film) => (
              <Link key={film.id} href={`/movies/${film.tmdbId}`}>
                <div className="movie-hover proposal-card">
                  <div style={{ aspectRatio: '2/3', position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${film.posterPath}`}
                      alt={film.title}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.title}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                    {film.proposals.slice(0, 3).map((proposal: any) => (
                      <div key={proposal.id} style={{ width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', position: 'relative', background: '#333', border: '1px solid #000' }}>
                        <Image src={proposal.user.image || ''} alt={proposal.user.name || ''} fill unoptimized />
                      </div>
                    ))}
                    {film.proposals.length > 3 && (
                      <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: 4 }}>+{film.proposals.length - 3}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '1rem' }}>
            <p style={{ opacity: 0.5, marginBottom: '1rem' }}>Aún no hay propuestas.</p>
            <Link href="/search" className="btn btn-primary">Empezar a Proponer</Link>
          </div>
        )}
      </section>

    </div>
  );
}
