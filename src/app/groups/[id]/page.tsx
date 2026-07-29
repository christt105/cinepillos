import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) redirect("/login");

    const family = await prisma.family.findUnique({
        where: { id },
        include: {
            users: {
                include: {
                    proposals: {
                        where: { familyId: id },
                        include: { film: true },
                        orderBy: { createdAt: "desc" }
                    }
                }
            }
        }
    });

    if (!family) notFound();

    const isMember = family.users.some(u => u.id === session.user.id);
    if (!isMember && !session.user.isAdmin) redirect("/");

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "4rem" }}>
            <h1 style={{ fontSize: "2rem", marginBottom: "2rem" }}>{family.name}</h1>

            <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
                {family.users.map(member => (
                    <section key={member.id}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                            <div style={{
                                width: "48px", height: "48px", borderRadius: "50%",
                                overflow: "hidden", position: "relative", background: "#333", flexShrink: 0
                            }}>
                                {member.image ? (
                                    <Image
                                        src={member.image}
                                        alt={member.name || ""}
                                        fill
                                        style={{ objectFit: "cover" }}
                                        unoptimized
                                    />
                                ) : (
                                    <div style={{
                                        width: "100%", height: "100%",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: "hsl(var(--primary))", color: "#fff", fontWeight: "bold"
                                    }}>
                                        {(member.name || "?")[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h2 style={{ fontSize: "1.2rem" }}>{member.name}</h2>
                                <span style={{ opacity: 0.6, fontSize: "0.9rem" }}>
                                    {member.proposals.length} {member.proposals.length === 1 ? "propuesta" : "propuestas"}
                                </span>
                            </div>
                        </div>

                        {member.proposals.length > 0 ? (
                            <div className="responsive-proposals">
                                {member.proposals.map(proposal => (
                                    <Link key={proposal.id} href={`/movies/${proposal.film.tmdbId}`}>
                                        <div className="movie-hover proposal-card">
                                            <div style={{ aspectRatio: "2/3", position: "relative", borderRadius: "0.5rem", overflow: "hidden", marginBottom: "0.5rem" }}>
                                                {proposal.film.posterPath ? (
                                                    <Image
                                                        src={`https://image.tmdb.org/t/p/w500${proposal.film.posterPath}`}
                                                        alt={proposal.film.title}
                                                        fill
                                                        style={{ objectFit: "cover" }}
                                                    />
                                                ) : (
                                                    <div style={{ width: "100%", height: "100%", background: "#333", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                        <span style={{ opacity: 0.4, fontSize: "0.8rem" }}>Sin poster</span>
                                                    </div>
                                                )}
                                            </div>
                                            <h4 style={{ fontSize: "0.9rem", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {proposal.film.title}
                                            </h4>
                                            {proposal.film.releaseDate && (
                                                <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                                                    {new Date(proposal.film.releaseDate).getFullYear()}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p style={{ opacity: 0.5, padding: "1rem 0" }}>Sin propuestas todavía.</p>
                        )}
                    </section>
                ))}
            </div>
        </div>
    );
}
