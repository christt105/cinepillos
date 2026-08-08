/*
  Warnings:

  - Made the column `groupId` on table `Meeting` required. This step will fail if there are existing NULL values in that column.
  - Made the column `groupId` on table `Proposal` required. This step will fail if there are existing NULL values in that column.

*/

-- Backfill Proposal.groupId from the sole group of the user who created it.
UPDATE "Proposal"
SET "groupId" = (
    SELECT "groupId" FROM "Membership" WHERE "Membership"."userId" = "Proposal"."userId"
)
WHERE "groupId" IS NULL
AND (SELECT COUNT(*) FROM "Membership" WHERE "Membership"."userId" = "Proposal"."userId") = 1;

-- Drop proposals that still have no group: the creator belongs to zero or
-- several groups, so there is no single group to assign them to.
DELETE FROM "Proposal" WHERE "groupId" IS NULL;

-- Meetings have no creator to backfill a group from, so orphaned meetings and
-- everything hanging off them are dropped instead of guessed at.
DELETE FROM "Vote" WHERE "candidateId" IN (
    SELECT "MeetingCandidate"."id" FROM "MeetingCandidate"
    JOIN "Meeting" ON "Meeting"."id" = "MeetingCandidate"."meetingId"
    WHERE "Meeting"."groupId" IS NULL
);
DELETE FROM "MeetingCandidate" WHERE "meetingId" IN (
    SELECT "id" FROM "Meeting" WHERE "groupId" IS NULL
);
DELETE FROM "Meeting" WHERE "groupId" IS NULL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Meeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "selectedFilmId" TEXT,
    "groupId" TEXT NOT NULL,
    CONSTRAINT "Meeting_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Meeting" ("date", "groupId", "id", "selectedFilmId", "status") SELECT "date", "groupId", "id", "selectedFilmId", "status" FROM "Meeting";
DROP TABLE "Meeting";
ALTER TABLE "new_Meeting" RENAME TO "Meeting";
CREATE TABLE "new_Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Proposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Proposal_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Proposal_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Proposal" ("createdAt", "filmId", "groupId", "id", "userId") SELECT "createdAt", "filmId", "groupId", "id", "userId" FROM "Proposal";
DROP TABLE "Proposal";
ALTER TABLE "new_Proposal" RENAME TO "Proposal";
CREATE UNIQUE INDEX "Proposal_userId_filmId_groupId_key" ON "Proposal"("userId", "filmId", "groupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
