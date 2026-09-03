-- AlterTable
ALTER TABLE "products"
ADD COLUMN "slug" VARCHAR(160) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
