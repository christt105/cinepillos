import { z } from "zod";

const id = z.string().min(1);

export const activeGroupSchema = z.object({
    groupId: id,
});

export const devLoginSchema = z.object({
    userId: id,
});

export const proposalSchema = z.object({
    tmdbId: z.coerce.number().int().positive(),
    title: z.string().min(1).max(300),
    overview: z.string().max(5000).nullish().transform(value => value ?? ""),
    posterPath: z.string().max(300).nullish(),
    releaseDate: z.string().max(30).nullish(),
});

const futureDate = z.coerce.date().refine(value => value.getTime() > Date.now(), {
    message: "The meeting date must be in the future",
});

/** A meeting with no date is created in the `PLANNING` phase. */
export const meetingSchema = z.object({
    date: futureDate.nullish(),
});

export const meetingScheduleSchema = z.object({
    date: futureDate,
});

export const candidateSchema = z.object({
    filmId: id,
});

export const voteSchema = z.object({
    candidateId: id,
});

export const userUpdateSchema = z
    .object({
        name: z.string().min(1).max(60).optional(),
    })
    .strict();

const tmdbId = z.coerce.number().int().positive();
const mediaType = z.enum(["movie", "tv"]);

/**
 * Never a client-supplied URL: `path`/`characterId` only pick out which of a
 * title's own TMDB/TVDB images to use, and the backend re-validates the
 * choice against a fresh API response before it resolves and stores an
 * actual URL.
 */
export const avatarSelectSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("poster"), tmdbId, mediaType, path: z.string().min(1).max(300) }),
    z.object({ kind: z.literal("cast"), tmdbId, mediaType, characterId: z.coerce.number().int().positive() }),
]);

export const adminUserCreateSchema = z.object({
    name: z.string().min(1).max(60),
    email: z.email().max(200),
});

export const adminUserUpdateSchema = z
    .object({
        name: z.string().min(1).max(60).optional(),
        email: z.email().max(200).optional(),
        isAdmin: z.boolean().optional(),
    })
    .strict();

export const groupCreateSchema = z.object({
    name: z.string().min(1).max(60),
});

export const adminMembershipSchema = z.object({
    groupId: id,
});

export const invitationCreateSchema = z.object({
    expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
    maxUses: z.coerce.number().int().min(1).max(100).nullish(),
});
