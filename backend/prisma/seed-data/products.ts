import { ProductType, VariantOptionType } from "../../src/generated/prisma/client";

type SimpleProductSeed = {
  slug: string;
  title: string;
  description: string;
  price: string;
  type: typeof ProductType.SIMPLE;
  variant: {
    sku: string;
    stockQuantity: number;
  };
};

type ConfigurableProductSeed = {
  slug: string;
  title: string;
  description: string;
  price: string;
  type: typeof ProductType.CONFIGURABLE;
  optionType: VariantOptionType;
  variants: Array<{
    sku: string;
    label: string;
    optionValue: string;
    stockQuantity: number;
  }>;
};

export type ProductSeedDefinition = SimpleProductSeed | ConfigurableProductSeed;

export type ProductVariantSeedDefinition = {
  sku: string;
  label: string;
  optionType: VariantOptionType | null;
  optionValue: string | null;
  stockQuantity: number;
  isDefault: boolean;
};

export const PRODUCT_SEEDS: ProductSeedDefinition[] = [
  {
    slug: "classic-cotton-t-shirt",
    title: "Classic Cotton T-Shirt",
    description: "Soft and breathable cotton T-shirt designed for comfortable everyday wear.",
    price: "24.99",
    type: ProductType.CONFIGURABLE,
    optionType: VariantOptionType.SIZE,
    variants: [
      { sku: "TSHIRT-S", label: "Small", optionValue: "Small", stockQuantity: 18 },
      { sku: "TSHIRT-M", label: "Medium", optionValue: "Medium", stockQuantity: 9 },
      { sku: "TSHIRT-L", label: "Large", optionValue: "Large", stockQuantity: 0 }
    ]
  },
  {
    slug: "everyday-hoodie",
    title: "Everyday Hoodie",
    description: "Warm everyday hoodie with a soft interior, adjustable hood, and relaxed fit.",
    price: "54.90",
    type: ProductType.CONFIGURABLE,
    optionType: VariantOptionType.SIZE,
    variants: [
      { sku: "HOODIE-S", label: "Small", optionValue: "Small", stockQuantity: 6 },
      { sku: "HOODIE-M", label: "Medium", optionValue: "Medium", stockQuantity: 3 },
      { sku: "HOODIE-L", label: "Large", optionValue: "Large", stockQuantity: 1 }
    ]
  },
  {
    slug: "classic-leather-belt",
    title: "Classic Leather Belt",
    description: "Durable classic-style leather belt suitable for casual and formal outfits.",
    price: "29.50",
    type: ProductType.CONFIGURABLE,
    optionType: VariantOptionType.SIZE,
    variants: [
      { sku: "BELT-S", label: "Small", optionValue: "Small", stockQuantity: 12 },
      { sku: "BELT-M", label: "Medium", optionValue: "Medium", stockQuantity: 5 },
      { sku: "BELT-L", label: "Large", optionValue: "Large", stockQuantity: 2 }
    ]
  },
  {
    slug: "wireless-headphones",
    title: "Wireless Headphones",
    description:
      "Comfortable wireless headphones with clear sound, padded ear cups, and long battery life.",
    price: "79.99",
    type: ProductType.CONFIGURABLE,
    optionType: VariantOptionType.COLOR,
    variants: [
      { sku: "HEADPHONES-BLACK", label: "Black", optionValue: "Black", stockQuantity: 20 },
      { sku: "HEADPHONES-WHITE", label: "White", optionValue: "White", stockQuantity: 4 },
      { sku: "HEADPHONES-BLUE", label: "Blue", optionValue: "Blue", stockQuantity: 0 }
    ]
  },
  {
    slug: "stainless-steel-water-bottle",
    title: "Stainless Steel Water Bottle",
    description:
      "Reusable stainless steel bottle that keeps drinks cold or hot throughout the day.",
    price: "19.95",
    type: ProductType.CONFIGURABLE,
    optionType: VariantOptionType.COLOR,
    variants: [
      { sku: "BOTTLE-BLACK", label: "Black", optionValue: "Black", stockQuantity: 30 },
      { sku: "BOTTLE-WHITE", label: "White", optionValue: "White", stockQuantity: 8 },
      { sku: "BOTTLE-BLUE", label: "Blue", optionValue: "Blue", stockQuantity: 3 }
    ]
  },
  {
    slug: "wireless-mouse",
    title: "Wireless Mouse",
    description: "Compact wireless mouse with an ergonomic shape and reliable everyday performance.",
    price: "25.90",
    type: ProductType.SIMPLE,
    variant: { sku: "MOUSE-DEFAULT", stockQuantity: 50 }
  },
  {
    slug: "mechanical-keyboard",
    title: "Mechanical Keyboard",
    description: "Responsive mechanical keyboard with tactile switches and a durable compact frame.",
    price: "69.00",
    type: ProductType.SIMPLE,
    variant: { sku: "KEYBOARD-DEFAULT", stockQuantity: 14 }
  },
  {
    slug: "usb-c-hub",
    title: "USB-C Hub",
    description:
      "Multi-port USB-C hub with USB, HDMI, and card-reader connections for modern laptops.",
    price: "39.99",
    type: ProductType.SIMPLE,
    variant: { sku: "USBHUB-DEFAULT", stockQuantity: 4 }
  },
  {
    slug: "aluminum-laptop-stand",
    title: "Aluminum Laptop Stand",
    description: "Stable aluminum laptop stand designed to improve posture and desktop airflow.",
    price: "44.50",
    type: ProductType.SIMPLE,
    variant: { sku: "LAPTOPSTAND-DEFAULT", stockQuantity: 22 }
  },
  {
    slug: "led-desk-lamp",
    title: "LED Desk Lamp",
    description: "Adjustable LED desk lamp with multiple brightness levels for work and study.",
    price: "34.75",
    type: ProductType.SIMPLE,
    variant: { sku: "DESKLAMP-DEFAULT", stockQuantity: 9 }
  },
  {
    slug: "portable-ssd-1tb",
    title: "Portable SSD 1TB",
    description:
      "Fast and compact one-terabyte portable solid-state drive for backups and file transfers.",
    price: "109.99",
    type: ProductType.SIMPLE,
    variant: { sku: "SSD1TB-DEFAULT", stockQuantity: 7 }
  },
  {
    slug: "ceramic-coffee-mug",
    title: "Ceramic Coffee Mug",
    description: "Durable ceramic coffee mug with a comfortable handle and clean minimalist finish.",
    price: "12.50",
    type: ProductType.SIMPLE,
    variant: { sku: "MUG-DEFAULT", stockQuantity: 40 }
  },
  {
    slug: "non-slip-yoga-mat",
    title: "Non-Slip Yoga Mat",
    description: "Cushioned non-slip yoga mat designed for stretching, yoga, and home workouts.",
    price: "27.00",
    type: ProductType.SIMPLE,
    variant: { sku: "YOGAMAT-DEFAULT", stockQuantity: 6 }
  },
  {
    slug: "premium-notebook-set",
    title: "Premium Notebook Set",
    description: "Set of premium ruled notebooks suitable for office notes, planning, and study.",
    price: "16.99",
    type: ProductType.SIMPLE,
    variant: { sku: "NOTEBOOK-DEFAULT", stockQuantity: 100 }
  },
  {
    slug: "adjustable-phone-stand",
    title: "Adjustable Phone Stand",
    description: "Foldable adjustable phone stand for comfortable desk viewing and video calls.",
    price: "14.25",
    type: ProductType.SIMPLE,
    variant: { sku: "PHONESTAND-DEFAULT", stockQuantity: 2 }
  }
];

export function getVariantSeeds(product: ProductSeedDefinition): ProductVariantSeedDefinition[] {
  if (product.type === ProductType.SIMPLE) {
    return [
      {
        sku: product.variant.sku,
        label: "Default",
        optionType: null,
        optionValue: null,
        stockQuantity: product.variant.stockQuantity,
        isDefault: true
      }
    ];
  }

  return product.variants.map((variant) => ({
    sku: variant.sku,
    label: variant.label,
    optionType: product.optionType,
    optionValue: variant.optionValue,
    stockQuantity: variant.stockQuantity,
    isDefault: false
  }));
}

export function validateProductSeeds(products: ProductSeedDefinition[]): void {
  const errors: string[] = [];
  const slugs = new Set<string>();
  const skus = new Set<string>();
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const pricePattern = /^\d+\.\d{2}$/;

  const simpleProducts = products.filter((product) => product.type === ProductType.SIMPLE);
  const configurableProducts = products.filter(
    (product) => product.type === ProductType.CONFIGURABLE
  );
  const sizeProducts = configurableProducts.filter(
    (product) => product.optionType === VariantOptionType.SIZE
  );
  const colorProducts = configurableProducts.filter(
    (product) => product.optionType === VariantOptionType.COLOR
  );
  const multiVariantProducts = products.filter((product) => getVariantSeeds(product).length > 1);

  if (products.length !== 15) errors.push("Expected exactly 15 product definitions.");
  if (simpleProducts.length !== 10) errors.push("Expected exactly 10 simple products.");
  if (configurableProducts.length !== 5) errors.push("Expected exactly 5 configurable products.");
  if (sizeProducts.length !== 3) errors.push("Expected exactly 3 size-configurable products.");
  if (colorProducts.length !== 2) errors.push("Expected exactly 2 color-configurable products.");
  if (multiVariantProducts.length < 3) {
    errors.push("Expected at least 3 products with more than one variant.");
  }

  for (const product of products) {
    if (!product.title.trim()) errors.push(`Product ${product.slug} has an empty title.`);
    if (!product.description.trim()) {
      errors.push(`Product ${product.slug} has an empty description.`);
    }
    if (!slugPattern.test(product.slug)) {
      errors.push(`Product slug ${product.slug} must be lowercase and hyphenated.`);
    }
    if (slugs.has(product.slug)) errors.push(`Duplicate product slug ${product.slug}.`);
    slugs.add(product.slug);

    if (!pricePattern.test(product.price)) {
      errors.push(`Product ${product.slug} price must be a nonnegative value with two decimals.`);
    }

    const variants = getVariantSeeds(product);
    const optionKeys = new Set<string>();

    if (product.type === ProductType.SIMPLE) {
      if (variants.length !== 1) {
        errors.push(`Simple product ${product.slug} must have exactly one variant.`);
      }

      const [variant] = variants;
      if (
        !variant ||
        !variant.isDefault ||
        variant.optionType !== null ||
        variant.optionValue !== null
      ) {
        errors.push(`Simple product ${product.slug} must use one internal default variant.`);
      }
    } else {
      if (variants.length < 2) {
        errors.push(`Configurable product ${product.slug} must have at least two variants.`);
      }

      for (const variant of variants) {
        if (variant.isDefault) {
          errors.push(`Configurable product ${product.slug} cannot have a default variant.`);
        }
        if (variant.optionType !== product.optionType || variant.optionValue === null) {
          errors.push(`Configurable product ${product.slug} variants need option type and value.`);
        }
      }
    }

    for (const variant of variants) {
      if (!variant.sku.trim()) errors.push(`Product ${product.slug} has an empty SKU.`);
      if (!variant.label.trim()) errors.push(`Product ${product.slug} has an empty label.`);
      if (skus.has(variant.sku)) errors.push(`Duplicate SKU ${variant.sku}.`);
      skus.add(variant.sku);

      if (!Number.isInteger(variant.stockQuantity) || variant.stockQuantity < 0) {
        errors.push(`Variant ${variant.sku} stock must be a nonnegative integer.`);
      }

      if (variant.optionType !== null && variant.optionValue !== null) {
        const optionKey = `${variant.optionType}:${variant.optionValue}`;
        if (optionKeys.has(optionKey)) {
          errors.push(`Product ${product.slug} has duplicate option value ${optionKey}.`);
        }
        optionKeys.add(optionKey);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid product seed definitions:\n${errors.join("\n")}`);
  }
}
