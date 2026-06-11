-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityType" TEXT NOT NULL,
    "activityNote" TEXT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "stopReason" TEXT NOT NULL,
    "distractionCategory" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FocusInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generatedAt" DATETIME NOT NULL,
    "sessionsAnalyzed" INTEGER NOT NULL,
    "topDistractions" TEXT NOT NULL,
    "advice" TEXT NOT NULL,
    "stats" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "FocusSession_startedAt_idx" ON "FocusSession"("startedAt");

-- CreateIndex
CREATE INDEX "FocusSession_distractionCategory_idx" ON "FocusSession"("distractionCategory");

-- CreateIndex
CREATE INDEX "FocusSession_activityType_idx" ON "FocusSession"("activityType");

-- CreateIndex
CREATE INDEX "FocusInsight_generatedAt_idx" ON "FocusInsight"("generatedAt");
