-- Google integrations + tracked tags + pending captures

ALTER TABLE "TaskRecurrence" ADD COLUMN "autoCreateCalendarEvent" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "IntegrationToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "expiresAt" DATETIME,
    "scopes" TEXT NOT NULL,
    "gmailLastSyncAt" DATETIME,
    "calendarLastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "IntegrationToken_provider_key" ON "IntegrationToken"("provider");

CREATE TABLE "IntegrationScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "etag" TEXT,
    "kind" TEXT NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT,
    "capturesCreated" INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX "IntegrationScan_provider_externalId_key" ON "IntegrationScan"("provider", "externalId");
CREATE INDEX "IntegrationScan_provider_kind_idx" ON "IntegrationScan"("provider", "kind");

CREATE TABLE "TrackedTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "aliases" TEXT NOT NULL DEFAULT '[]',
    "areaId" TEXT,
    "askFields" TEXT NOT NULL DEFAULT '{}',
    "defaultLogKind" TEXT NOT NULL DEFAULT 'note',
    "autoLog" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrackedTag_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "TrackedTag_active_idx" ON "TrackedTag"("active");

CREATE TABLE "PendingCapture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "trackedTagId" TEXT,
    "title" TEXT NOT NULL,
    "snippet" TEXT,
    "occurredAt" DATETIME,
    "suggestedAreaId" TEXT,
    "askFields" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "snoozedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" DATETIME,
    CONSTRAINT "PendingCapture_trackedTagId_fkey" FOREIGN KEY ("trackedTagId") REFERENCES "TrackedTag"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "PendingCapture_status_snoozedUntil_idx" ON "PendingCapture"("status", "snoozedUntil");
CREATE INDEX "PendingCapture_sourceRef_idx" ON "PendingCapture"("sourceRef");
