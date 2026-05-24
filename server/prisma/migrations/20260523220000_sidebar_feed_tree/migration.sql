-- Sidebar feed: nested folder tree (parentId on FeedGroup)
ALTER TABLE "FeedGroup" ADD COLUMN "parentId" TEXT;

CREATE INDEX "FeedGroup_parentId_idx" ON "FeedGroup"("parentId");

-- Redefine FK with cascade delete when parent folder is removed
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_FeedGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeedGroup_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FeedGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_FeedGroup" ("id", "name", "parentId", "sortOrder", "createdAt", "updatedAt")
SELECT "id", "name", "parentId", "sortOrder", "createdAt", "updatedAt" FROM "FeedGroup";

DROP TABLE "FeedGroup";
ALTER TABLE "new_FeedGroup" RENAME TO "FeedGroup";

CREATE INDEX "FeedGroup_parentId_idx" ON "FeedGroup"("parentId");

PRAGMA foreign_keys=ON;
