-- Sidebar feed groups and items
CREATE TABLE "FeedGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "FeedItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excludedFromRotation" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeedItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FeedGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "FeedItem_groupId_idx" ON "FeedItem"("groupId");
