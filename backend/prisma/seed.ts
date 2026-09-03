import { databaseService } from "../src/infrastructure/database";
import { prisma } from "../src/infrastructure/database";
import { hashPassword } from "../src/shared/security/password-hasher";
import { Prisma, ProductType, VariantOptionType } from "../src/generated/prisma/client";
import {
  getVariantSeeds,
  PRODUCT_SEEDS,
  validateProductSeeds
} from "./seed-data/products";

const DEMO_USER_EMAIL = "demo@ecommerce.local";
const DEMO_USER_PASSWORD = "DemoUser@2026";
const EXPECTED_PRODUCT_COUNT = 15;
const EXPECTED_VARIANT_COUNT = 25;
const EXPECTED_SIMPLE_PRODUCT_COUNT = 10;
const EXPECTED_CONFIGURABLE_PRODUCT_COUNT = 5;
const EXPECTED_SIZE_PRODUCT_COUNT = 3;
const EXPECTED_COLOR_PRODUCT_COUNT = 2;
const EXPECTED_MULTI_VARIANT_PRODUCT_COUNT = 5;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function main(): Promise<void> {
  validateProductSeeds(PRODUCT_SEEDS);

  await databaseService.connect();

  const email = normalizeEmail(DEMO_USER_EMAIL);
  const passwordHash = await hashPassword(DEMO_USER_PASSWORD);
  const managedSlugs = PRODUCT_SEEDS.map((product) => product.slug);

  await prisma.$transaction(async (transaction) => {
    await transaction.user.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, passwordHash }
    });

    const unexpectedProducts = await transaction.product.findMany({
      where: { slug: { notIn: managedSlugs } },
      select: { id: true, slug: true, title: true },
      orderBy: { id: "asc" }
    });

    if (unexpectedProducts.length > 0) {
      const details = unexpectedProducts
        .map((product) => `${product.id}:${product.slug}:${product.title}`)
        .join(", ");
      throw new Error(`Unexpected product records exist; refusing to seed catalog. ${details}`);
    }

    for (const product of PRODUCT_SEEDS) {
      const seededProduct = await transaction.product.upsert({
        where: { slug: product.slug },
        update: {
          title: product.title,
          description: product.description,
          price: new Prisma.Decimal(product.price),
          type: product.type
        },
        create: {
          slug: product.slug,
          title: product.title,
          description: product.description,
          price: new Prisma.Decimal(product.price),
          type: product.type
        }
      });

      for (const variant of getVariantSeeds(product)) {
        const existingVariant = await transaction.productVariant.findUnique({
          where: { sku: variant.sku },
          select: { productId: true }
        });

        if (existingVariant && existingVariant.productId !== seededProduct.id) {
          throw new Error(
            `SKU ${variant.sku} already belongs to product ${existingVariant.productId}; refusing to move it to ${seededProduct.id}.`
          );
        }

        await transaction.productVariant.upsert({
          where: { sku: variant.sku },
          update: {
            label: variant.label,
            optionType: variant.optionType,
            optionValue: variant.optionValue,
            stockQuantity: variant.stockQuantity,
            isDefault: variant.isDefault
          },
          create: {
            productId: seededProduct.id,
            sku: variant.sku,
            label: variant.label,
            optionType: variant.optionType,
            optionValue: variant.optionValue,
            stockQuantity: variant.stockQuantity,
            isDefault: variant.isDefault
          }
        });
      }
    }

    const products = await transaction.product.findMany({
      include: { variants: true },
      orderBy: { slug: "asc" }
    });
    const demoUserCount = await transaction.user.count({ where: { email } });
    const variantCount = products.reduce((total, product) => total + product.variants.length, 0);
    const simpleProducts = products.filter((product) => product.type === ProductType.SIMPLE);
    const configurableProducts = products.filter(
      (product) => product.type === ProductType.CONFIGURABLE
    );
    const sizeProducts = configurableProducts.filter((product) =>
      product.variants.every((variant) => variant.optionType === VariantOptionType.SIZE)
    );
    const colorProducts = configurableProducts.filter((product) =>
      product.variants.every((variant) => variant.optionType === VariantOptionType.COLOR)
    );
    const multiVariantProducts = products.filter((product) => product.variants.length > 1);
    const simpleProductsExposeOptions = simpleProducts.some((product) =>
      product.variants.some(
        (variant) =>
          !variant.isDefault || variant.optionType !== null || variant.optionValue !== null
      )
    );
    const configurableVariantsMissingOptions = configurableProducts.some((product) =>
      product.variants.some(
        (variant) =>
          variant.isDefault || variant.optionType === null || variant.optionValue === null
      )
    );

    if (
      products.length !== EXPECTED_PRODUCT_COUNT ||
      variantCount !== EXPECTED_VARIANT_COUNT ||
      simpleProducts.length !== EXPECTED_SIMPLE_PRODUCT_COUNT ||
      configurableProducts.length !== EXPECTED_CONFIGURABLE_PRODUCT_COUNT ||
      sizeProducts.length !== EXPECTED_SIZE_PRODUCT_COUNT ||
      colorProducts.length !== EXPECTED_COLOR_PRODUCT_COUNT ||
      multiVariantProducts.length !== EXPECTED_MULTI_VARIANT_PRODUCT_COUNT ||
      demoUserCount !== 1 ||
      simpleProductsExposeOptions ||
      configurableVariantsMissingOptions
    ) {
      throw new Error("Seeded catalog verification failed; transaction was rolled back.");
    }
  });

  console.info(`Demo user seed completed for ${email}.`);
  console.info(`Product catalog seed completed with ${EXPECTED_PRODUCT_COUNT} products.`);
}

void main()
  .catch((error: unknown) => {
    console.error("Database seed failed.");
    console.error(error instanceof Error ? error.message : "Unknown seed error.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await databaseService.disconnect();
  });
