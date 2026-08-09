import { z } from "zod";

const id = z.string().min(1);

export const activeGroupSchema = z.object({
    groupId: id,
});

export const proposalSchema = z.object({
    tmdbId: z.coerce.number().int().positive(),
    title: z.string().min(1).max(300),
    overview: z.string().max(5000).nullish().transform(value => value ?? ""),
    posterPath: z.string().max(300).nullish(),
    releaseDate: z.string().max(30).nullish(),
});

export const meetingSchema = z.object({
    date: z.coerce.date().refine(value => value.getTime() > Date.now(), {
        message: "The meeting date must be in the future",
    }),
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
        image: z.string().max(500).nullish(),
    })
    .strict();

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
