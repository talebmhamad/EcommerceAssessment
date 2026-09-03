-- CreateEnum
CREATE TYPE "VariantOptionType" AS ENUM ('SIZE', 'COLOR');

-- AlterTable
ALTER TABLE "product_variants"
ADD COLUMN "option_type" "VariantOptionType",
ADD COLUMN "option_value" VARCHAR(60);

-- DropIndex
DROP INDEX "product_variants_product_id_label_key";

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_option_type_option_value_key" ON "product_variants"("product_id", "option_type", "option_value");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_one_default_per_product" ON "product_variants"("product_id") WHERE "is_default" = TRUE;

-- AddCheckConstraint
ALTER TABLE "product_variants"
ADD CONSTRAINT "product_variants_option_consistency"
CHECK (
  (
    "is_default" = TRUE
    AND "option_type" IS NULL
    AND "option_value" IS NULL
  )
  OR
  (
    "is_default" = FALSE
    AND "option_type" IS NOT NULL
    AND "option_value" IS NOT NULL
  )
);
