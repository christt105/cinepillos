-- Rename Family -> Group
ALTER TABLE "Family" RENAME TO "Group";

-- Rename family* columns -> group*
ALTER TABLE "User" RENAME COLUMN "activeFamilyId" TO "activeGroupId";
ALTER TABLE "Proposal" RENAME COLUMN "familyId" TO "groupId";
ALTER TABLE "Meeting" RENAME COLUMN "familyId" TO "groupId";

-- Keep the unique index name in sync with the renamed column
DROP INDEX "Proposal_userId_filmId_familyId_key";
CREATE UNIQUE INDEX "Proposal_userId_filmId_groupId_key" ON "Proposal"("userId", "filmId", "groupId");

-- Explicit membership with role, replacing the implicit User<->Family many-to-many
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Membership_userId_groupId_key" ON "Membership"("userId", "groupId");

-- Backfill Membership from the old implicit join table (_FamilyMembers: A = Family/Group id, B = User id).
-- There is no per-group owner recorded anywhere today, so this can only guess: existing global
-- admins become OWNER of every group they're in, everyone else becomes MEMBER. Review/adjust roles
-- by hand after this runs against the real dataset.
INSERT INTO "Membership" ("id", "userId", "groupId", "role", "createdAt")
SELECT
    lower(hex(randomblob(16))),
    fm."B",
    fm."A",
    CASE WHEN u."isAdmin" = 1 THEN 'OWNER' ELSE 'MEMBER' END,
    CURRENT_TIMESTAMP
FROM "_FamilyMembers" fm
JOIN "User" u ON u."id" = fm."B";

DROP TABLE "_FamilyMembers";

-- Dead models: no queries against them anywhere in src/
DROP TABLE "Like";
DROP TABLE "Wishlist";
DROP TABLE "Comment";
