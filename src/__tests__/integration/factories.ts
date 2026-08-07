import type { Film, Group, Meeting, MeetingCandidate, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

let sequence = 0;
const next = () => ++sequence;

export async function createUser(overrides: Partial<User> = {}): Promise<User> {
    const n = next();

    return prisma.user.create({
        data: {
            name: `User ${n}`,
            email: `user${n}@example.test`,
            password: "hashed",
            ...overrides,
        },
    });
}

export type MemberSpec = { user: User; role?: string };

/** Creates a group and its memberships in one go. First member defaults to OWNER. */
export async function createGroup(
    members: MemberSpec[] = [],
    overrides: Partial<Group> = {}
): Promise<Group> {
    const n = next();

    return prisma.group.create({
        data: {
            name: `Group ${n}`,
            ...overrides,
            memberships: {
                create: members.map(({ user, role }, index) => ({
                    userId: user.id,
                    role: role ?? (index === 0 ? "OWNER" : "MEMBER"),
                })),
            },
        },
    });
}

export async function createFilm(overrides: Partial<Film> = {}): Promise<Film> {
    const n = next();

    return prisma.film.create({
        data: {
            tmdbId: 100000 + n,
            title: `Film ${n}`,
            overview: `Overview ${n}`,
            posterPath: `/poster-${n}.jpg`,
            releaseDate: "2026-01-01",
            ...overrides,
        },
    });
}

const inDays = (days: number) => new Date(Date.now() + days * 86400000);

export async function createMeeting(
    group: Group,
    overrides: Partial<Meeting> = {}
): Promise<Meeting> {
    return prisma.meeting.create({
        data: {
            date: inDays(7),
            status: "VOTING",
            groupId: group.id,
            ...overrides,
        },
    });
}

export async function createCandidate(
    meeting: Meeting,
    user: User,
    film?: Film
): Promise<MeetingCandidate & { film: Film }> {
    const candidateFilm = film ?? (await createFilm());

    return prisma.meetingCandidate.create({
        data: { meetingId: meeting.id, filmId: candidateFilm.id, userId: user.id },
        include: { film: true },
    });
}

export async function createVote(candidate: MeetingCandidate, user: User) {
    return prisma.vote.create({ data: { candidateId: candidate.id, userId: user.id } });
}

export async function createProposal(group: Group, user: User, film?: Film) {
    const proposalFilm = film ?? (await createFilm());

    return prisma.proposal.create({
        data: { userId: user.id, filmId: proposalFilm.id, groupId: group.id },
    });
}

/** Empties every table between tests, keeping the migrated schema. */
export async function resetDatabase() {
    await prisma.vote.deleteMany();
    await prisma.meetingCandidate.deleteMany();
    await prisma.meeting.deleteMany();
    await prisma.proposal.deleteMany();
    await prisma.film.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.user.updateMany({ data: { activeGroupId: null } });
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();
}
