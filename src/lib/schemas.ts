import { z } from "zod";

const id = z.string().min(1);
const password = z.string().min(4).max(64);

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
        currentPassword: z.string().max(64).optional(),
        newPassword: password.optional(),
    })
    .strict();

export const adminUserCreateSchema = z.object({
    name: z.string().min(1).max(60),
    email: z.email().max(200).optional(),
    password,
});

export const adminUserUpdateSchema = z
    .object({
        name: z.string().min(1).max(60).optional(),
        email: z.email().max(200).nullish(),
        isAdmin: z.boolean().optional(),
        password: password.optional(),
    })
    .strict();

export const adminGroupCreateSchema = z.object({
    name: z.string().min(1).max(60),
});

export const adminMembershipSchema = z.object({
    groupId: id,
});

export const AVATAR_MIME_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
