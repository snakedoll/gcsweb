-- CreateTable
CREATE TABLE "Image" (
    "imageId" TEXT NOT NULL,
    "usage" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("imageId")
);
