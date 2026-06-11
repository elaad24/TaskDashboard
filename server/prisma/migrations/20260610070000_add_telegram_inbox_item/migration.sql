-- CreateTable
CREATE TABLE "TelegramInboxItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" INTEGER NOT NULL,
    "chatId" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL,
    "analyzedAt" DATETIME,
    "outcome" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "TelegramInboxItem_analyzedAt_idx" ON "TelegramInboxItem"("analyzedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramInboxItem_messageId_chatId_key" ON "TelegramInboxItem"("messageId", "chatId");
