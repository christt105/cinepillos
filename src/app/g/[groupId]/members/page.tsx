import { prisma } from "@/lib/prisma";
import { requireGroupPage } from "@/lib/group-page";
import Image from "next/image";
import Link from "next/link";
import { avatarUrl } from "@/lib/avatar";
import MembersManagement from "./MembersManagement";
import styles from "./members.module.css";

export const dynamic = "force-dynamic";

export default async function GroupMembersPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = await params;
    const { session, membership } = await requireGroupPage(groupId);

    const isOwnerOrAdmin = membership?.role === "OWNER" || !!session.user.isAdmin;

    const group = await prisma.group.findUniqueOrThrow({
        where: { id: groupId },
        include: {
            memberships: {
                include: {
                    user: {
                        include: {
                            proposals: {
                                where: { groupId },
                                include: { film: true },
                                orderBy: { createdAt: "desc" }
                            }
                        }
                    }
                }
            }
        }
    });

    const invitations = isOwnerOrAdmin
        ? await prisma.invitation.findMany({
            where: { groupId, revokedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
        })
        : [];

    return (
        <div className="page">
            <h1 className="page-title">{group.name}</h1>

            <MembersManagement
                groupId={groupId}
                groupName={group.name}
                currentUserId={session.user.id}
                isOwnerOrAdmin={isOwnerOrAdmin}
                members={group.memberships.map(m => ({ userId: m.userId, name: m.user.name, role: m.role }))}
                initialInvitations={invitations.map(i => ({
                    id: i.id,
                    token: i.token,
                    expiresAt: i.expiresAt.toISOString(),
                    maxUses: i.maxUses,
                    useCount: i.useCount,
                }))}
            />

            <div className={styles.list}>
                {group.memberships.map(({ user: member }) => (
                    <section key={member.id}>
                        <div className={styles.member}>
                            <div className={`avatar ${styles.memberAvatar}`}>
                                <Image
                                    src={avatarUrl(member)}
                                    alt={member.name || ""}
                                    fill
                                    className={styles.memberImage}
                                />
                            </div>
                            <div>
                                <h2 className={styles.memberName}>{member.name}</h2>
                                <span className={styles.memberCount}>
                                    {member.proposals.length} {member.proposals.length === 1 ? "propuesta" : "propuestas"}
                                </span>
                            </div>
                        </div>

                        {member.proposals.length > 0 ? (
                            <div className="responsive-proposals">
                                {member.proposals.map(proposal => (
                                    <Link key={proposal.id} href={`/g/${groupId}/movies/${proposal.film.tmdbId}`}>
                                        <div className="proposal-card">
                                            <div className="poster">
                                                {proposal.film.posterPath ? (
                                                    <Image
                                                        src={`https://image.tmdb.org/t/p/w500${proposal.film.posterPath}`}
                                                        alt={proposal.film.title}
                                                        fill
                                                        className="poster-image"
                                                    />
                                                ) : (
                                                    <div className="poster-placeholder">Sin poster</div>
                                                )}
                                            </div>
                                            <h4 className="poster-title">
                                                {proposal.film.title}
                                            </h4>
                                            {proposal.film.releaseDate && (
                                                <span className={styles.posterYear}>
                                                    {new Date(proposal.film.releaseDate).getFullYear()}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.empty}>Sin propuestas todavía.</p>
                        )}
                    </section>
                ))}
            </div>
        </div>
    );
}
