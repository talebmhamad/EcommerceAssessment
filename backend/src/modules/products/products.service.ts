import { prisma } from "../../infrastructure/database";
import type { Prisma } from "../../generated/prisma/client";
import { notFound } from "../../shared/errors/api-error";
import { formatPrice } from "../../shared/utilities/price";
import type {
  ProductDetailResponse,
  ProductListItemResponse
} from "./products.types";

const productListSelect = {
  id: true,
  title: true,
  price: true,
  type: true,
  variants: {
    select: {
      id: true,
      label: true,
      optionType: true,
      optionValue: true,
      stockQuantity: true
    },
    orderBy: {
      id: "asc"
    }
  }
} satisfies Prisma.ProductSelect;

const productDetailSelect = {
  id: true,
  title: true,
  price: true,
  description: true,
  type: true,
  variants: {
    select: {
      id: true,
      label: true,
      optionType: true,
      optionValue: true,
      stockQuantity: true
    },
    orderBy: {
      id: "asc"
    }
  }
} satisfies Prisma.ProductSelect;

type ProductListRecord = Prisma.ProductGetPayload<{
  select: typeof productListSelect;
}>;

type ProductDetailRecord = Prisma.ProductGetPayload<{
  select: typeof productDetailSelect;
}>;

function toProductListItem(product: ProductListRecord): ProductListItemResponse {
  return {
    id: product.id,
    title: product.title,
    price: formatPrice(product.price),
    type: product.type,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      optionType: variant.optionType,
      optionValue: variant.optionValue,
      stock: variant.stockQuantity
    }))
  };
}

function toProductDetail(product: ProductDetailRecord): ProductDetailResponse {
  const variants = product.variants.map((variant) => ({
    id: variant.id,
    label: variant.label,
    optionType: variant.optionType,
    optionValue: variant.optionValue,
    stock: variant.stockQuantity
  }));

  return {
    id: product.id,
    title: product.title,
    price: formatPrice(product.price),
    description: product.description,
    type: product.type,
    totalStock: variants.reduce((total, variant) => total + variant.stock, 0),
    variants
  };
}

export async function listProducts(): Promise<ProductListItemResponse[]> {
  const products = await prisma.product.findMany({
    select: productListSelect,
    orderBy: {
      id: "asc"
    }
  });

  return products.map(toProductListItem);
}

export async function getProductById(productId: number): Promise<ProductDetailResponse> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: productDetailSelect
  });

  if (!product) {
    throw notFound("Product not found.");
  }

  return toProductDetail(product);
}
