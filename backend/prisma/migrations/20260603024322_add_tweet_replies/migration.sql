-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tweets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tweets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tweets_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tweets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_tweets" ("created_at", "id", "text", "user_id") SELECT "created_at", "id", "text", "user_id" FROM "tweets";
DROP TABLE "tweets";
ALTER TABLE "new_tweets" RENAME TO "tweets";
CREATE INDEX "tweets_parent_id_idx" ON "tweets"("parent_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
