import Link from "next/link";

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', alignItems: 'center', textAlign: 'center', padding: '4rem 0' }}>
      <header style={{ maxWidth: '800px' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '1.5rem', lineHeight: 1.1, background: 'linear-gradient(135deg, #fff 0%, #aaa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Welcome to <span style={{ color: 'hsl(var(--primary))', WebkitTextFillColor: 'initial' }}>ClubDeCine</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'hsl(var(--foreground))', opacity: 0.8, marginBottom: '2.5rem' }}>
          Discover, propose, and vote on the next masterpiece for our movie night.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/search" className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}>
            Browse Films
          </Link>
          <Link href="/meetings" className="btn btn-ghost" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            Upcoming Meetings
          </Link>
        </div>
      </header>

      <section className="glass-card" style={{ padding: '2rem', borderRadius: '1rem', width: '100%', maxWidth: '1000px', textAlign: 'left' }}>
        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Features</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <div>
            <h3 style={{ color: 'hsl(var(--secondary))', marginBottom: '0.5rem' }}>Propose</h3>
            <p style={{ opacity: 0.7 }}>Search TMDB and suggest movies to the group wishlist.</p>
          </div>
          <div>
            <h3 style={{ color: 'hsl(var(--accent))', marginBottom: '0.5rem' }}>Vote</h3>
            <p style={{ opacity: 0.7 }}>Democratically select the next film for scheduled meetings.</p>
          </div>
          <div>
            <h3 style={{ color: 'hsl(var(--primary))', marginBottom: '0.5rem' }}>Track</h3>
            <p style={{ opacity: 0.7 }}>Keep a history of what we've watched and rated.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
