import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createFilm, createGroup, createUser, resetDatabase } from "./factories";

/**
 * `groupId` used to be nullable on Proposal and Meeting, which let rows fall
 * out of every group-scoped query. See grpnn3 in the vault for the backfill
 * migration; this locks the constraint in place going forward.
 */
beforeEach(async () => {
    await resetDatabase();
});

describe("groupId is required at the schema level", () => {
    it("refuses a Proposal without a group", async () => {
        const user = await createUser();
        const film = await createFilm();

        await expect(
            prisma.proposal.create({
                data: { userId: user.id, filmId: film.id, groupId: null as unknown as string },
            })
        ).rejects.toThrow();
    });

    it("refuses a Meeting without a group", async () => {
        await expect(
            prisma.meeting.create({
                data: {
                    date: new Date(Date.now() + 86400000),
                    status: "VOTING",
                    groupId: null as unknown as string,
                },
            })
        ).rejects.toThrow();
    });

    it("still allows a Proposal and a Meeting with a group", async () => {
        const user = await createUser();
        const film = await createFilm();
        const group = await createGroup([{ user }]);

        const proposal = await prisma.proposal.create({
            data: { userId: user.id, filmId: film.id, groupId: group.id },
        });
        const meeting = await prisma.meeting.create({
            data: { date: new Date(Date.now() + 86400000), status: "VOTING", groupId: group.id },
        });

        expect(proposal.groupId).toBe(group.id);
        expect(meeting.groupId).toBe(group.id);
    });
});
