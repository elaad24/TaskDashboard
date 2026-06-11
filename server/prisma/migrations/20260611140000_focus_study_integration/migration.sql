-- AlterTable
ALTER TABLE "FocusSession" ADD COLUMN "description" TEXT;
ALTER TABLE "FocusSession" ADD COLUMN "isLearning" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FocusSession" ADD COLUMN "logId" TEXT;
ALTER TABLE "FocusSession" ADD COLUMN "studyTopicId" TEXT;
ALTER TABLE "FocusSession" ADD COLUMN "taskId" TEXT;
ALTER TABLE "FocusSession" ADD COLUMN "goalId" TEXT;
ALTER TABLE "FocusSession" ADD COLUMN "areaId" TEXT;

-- CreateIndex
CREATE INDEX "FocusSession_studyTopicId_idx" ON "FocusSession"("studyTopicId");

-- CreateIndex
CREATE INDEX "FocusSession_logId_idx" ON "FocusSession"("logId");
