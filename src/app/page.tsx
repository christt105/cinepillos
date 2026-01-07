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

  // Fetch Next Meeting
  const nextMeeting = await prisma.meeting.findFirst({
    where: {
      date: { gt: new Date() },
    },
    orderBy: { date: 'asc' },
    include: {
      candidates: {
        include: { film: true }
      }
    }
  });

  // Fetch Proposals (Recent)
  // Fetch Proposals (Recent Films with Proposals)
  const filmsWithProposals = await prisma.film.findMany({
    where: { proposals: { some: {} } },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { proposals: { include: { user: true } } }
  });

  return (
    <div style={{ paddingBottom: '4rem' }}>

      {/* Hero / Next Session */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#e5e5e5' }}>Next Session</h2>
        {nextMeeting ? (
          <div className="glass-card" style={{ padding: '2rem', borderRadius: '1rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 10 }}>
              <h3 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                {new Date(nextMeeting.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Status: {nextMeeting.status}</p>
              <Link href="/meetings" className="btn btn-primary">
                Go to Voting Room
              </Link>
            </div>
            {/* Background art if selected film exists? For now simple gradient */}
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%)', zIndex: 1 }} />
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '2rem', borderRadius: '1rem', textAlign: 'center' }}>
            <p style={{ opacity: 0.6, marginBottom: '1rem' }}>No upcoming sessions scheduled.</p>
            <button className="btn btn-ghost">Schedule One</button>
          </div>
        )}
      </section>

      {/* Proposals Row */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#e5e5e5' }}>Proposals</h2>
          <Link href="/search" className="btn btn-ghost" style={{ fontSize: '0.9rem' }}>
            <Plus size={16} style={{ marginRight: 4 }} /> Add New
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
            <p style={{ opacity: 0.5, marginBottom: '1rem' }}>No proposals yet.</p>
            <Link href="/search" className="btn btn-primary">Start Proposing</Link>
          </div>
        )}
      </section>

    </div>
  );
}
