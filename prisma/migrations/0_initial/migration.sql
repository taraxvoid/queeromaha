-- CreateTable "posts"
CREATE TABLE IF NOT EXISTS "posts" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL DEFAULT ''
);

-- CreateTable "makers"
CREATE TABLE IF NOT EXISTS "makers" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "human_name" VARCHAR(100) NOT NULL,
    "biz_name" VARCHAR(150),
    "email" VARCHAR(255) NOT NULL,
    "instagram" VARCHAR(255),
    "facebook" VARCHAR(255),
    "website" VARCHAR(255),
    "description" VARCHAR(280),
    "approved" BOOLEAN NOT NULL DEFAULT false
);
