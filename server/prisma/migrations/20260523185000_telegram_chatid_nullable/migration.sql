-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TelegramSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT,
    "username" TEXT,
    "pairedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pairingCode" TEXT,
    "pairingExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TelegramSubscriber" ("chatId", "createdAt", "id", "pairedAt", "pairingCode", "pairingExpiresAt", "updatedAt", "username") SELECT "chatId", "createdAt", "id", "pairedAt", "pairingCode", "pairingExpiresAt", "updatedAt", "username" FROM "TelegramSubscriber";
DROP TABLE "TelegramSubscriber";
ALTER TABLE "new_TelegramSubscriber" RENAME TO "TelegramSubscriber";
CREATE UNIQUE INDEX "TelegramSubscriber_chatId_key" ON "TelegramSubscriber"("chatId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
