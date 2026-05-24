-- AlterTable
ALTER TABLE "Goal" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows with stable order based on creation time
UPDATE "Goal" SET "sortOrder" = (
  SELECT COUNT(*) FROM "Goal" g2 WHERE g2."createdAt" <= "Goal"."createdAt"
);

UPDATE "Task" SET "sortOrder" = (
  SELECT COUNT(*) FROM "Task" t2 WHERE t2."createdAt" <= "Task"."createdAt"
);
