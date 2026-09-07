import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../infrastructure/database";
import { notFound } from "../../shared/errors/api-error";
import { formatPrice } from "../../shared/utilities/price";
import type { AddToWishlistBody } from "../../validation/request-schemas";
import type { WishlistProductResponse } from "./wishlist.types";

const wishlistProductSelect = {
  id: true,
  title: true,
  price: true
} satisfies Prisma.ProductSelect;

const wishlistItemSelect = {
  product: {
    select: wishlistProductSelect
  }
} satisfies Prisma.WishlistItemSelect;

type WishlistProductRecord = Prisma.ProductGetPayload<{
  select: typeof wishlistProductSelect;
}>;

type WishlistItemRecord = Prisma.WishlistItemGetPayload<{
  select: typeof wishlistItemSelect;
}>;

function toWishlistProduct(
  product: WishlistProductRecord
): WishlistProductResponse {
  return {
    id: product.id,
    title: product.title,
    price: formatPrice(product.price)
  };
}

function toWishlistItem(item: WishlistItemRecord): WishlistProductResponse {
  return toWishlistProduct(item.product);
}

export async function addWishlistItem(
  userId: number,
  body: AddToWishlistBody
): Promise<WishlistProductResponse> {
  const product = await prisma.product.findUnique({
    where: { id: body.productId },
    select: wishlistProductSelect
  });

  if (!product) {
    throw notFound("Product not found.");
  }

  await prisma.wishlistItem.upsert({
    where: {
      userId_productId: {
        userId,
        productId: product.id
      }
    },
    update: {},
    create: {
      userId,
      productId: product.id
    },
    select: {
      id: true
    }
  });

  return toWishlistProduct(product);
}

export async function listWishlistItems(
  userId: number
): Promise<WishlistProductResponse[]> {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    select: wishlistItemSelect,
    orderBy: [
      {
        createdAt: "asc"
      },
      {
        id: "asc"
      }
    ]
  });

  return items.map(toWishlistItem);
}

export async function removeWishlistItem(
  userId: number,
  productId: number
): Promise<WishlistProductResponse[]> {
  return prisma.$transaction(async (transaction) => {
    const deletedItem = await transaction.wishlistItem.deleteMany({
      where: {
        userId,
        productId
      }
    });

    if (deletedItem.count === 0) {
      throw notFound("Wishlist item not found.");
    }

    const items = await transaction.wishlistItem.findMany({
      where: { userId },
      select: wishlistItemSelect,
      orderBy: [
        {
          createdAt: "asc"
        },
        {
          id: "asc"
        }
      ]
    });

    return items.map(toWishlistItem);
  });
}
