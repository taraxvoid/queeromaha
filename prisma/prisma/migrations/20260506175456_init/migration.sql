-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "makers" (
    "id" SERIAL NOT NULL,
    "human_name" VARCHAR(100) NOT NULL,
    "biz_name" VARCHAR(150),
    "email" VARCHAR(255) NOT NULL,
    "instagram" VARCHAR(255),
    "facebook" VARCHAR(255),
    "website" VARCHAR(255),
    "description" VARCHAR(280),
    "approved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "makers_pkey" PRIMARY KEY ("id")
);
