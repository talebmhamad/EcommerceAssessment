import {
  Prisma,
  ProductType
} from "../../generated/prisma/client";
import { prisma } from "../../infrastructure/database";
import {
  badRequest,
  conflict,
  notFound
} from "../../shared/errors/api-error";
import { formatPrice } from "../../shared/utilities/price";
import type {
  AddToCartBody,
  ChangeCartVariantBody,
  UpdateCartQuantityBody
} from "../../validation/request-schemas";
import type {
  CartItemResponse,
  CartLineItemResponse,
  CartResponse
} from "./cart.types";

const cartItemSelect = {
  id: true,
  productId: true,
  variantId: true,
  quantity: true
} satisfies Prisma.CartItemSelect;

type CartItemRecord = Prisma.CartItemGetPayload<{
  select: typeof cartItemSelect;
}>;

const cartReadSelect = {
  id: true,
  productId: true,
  variantId: true,
  quantity: true,
  product: {
    select: {
      id: true,
      title: true,
      price: true
    }
  },
  variant: {
    select: {
      id: true,
      label: true,
      optionType: true,
      optionValue: true,
      stockQuantity: true
    }
  }
} satisfies Prisma.CartItemSelect;

type CartReadRecord = Prisma.CartItemGetPayload<{
  select: typeof cartReadSelect;
}>;

function toCartItemResponse(cartItem: CartItemRecord): CartItemResponse {
  return {
    id: cartItem.id,
    productId: cartItem.productId,
    variantId: cartItem.variantId,
    quantity: cartItem.quantity
  };
}

function getCartItemSubtotal(cartItem: CartReadRecord): Prisma.Decimal {
  return cartItem.product.price.mul(cartItem.quantity);
}

function toCartLineItemResponse(cartItem: CartReadRecord): CartLineItemResponse {
  const subtotal = getCartItemSubtotal(cartItem);

  return {
    id: cartItem.id,
    product: {
      id: cartItem.product.id,
      title: cartItem.product.title
    },
    variant: {
      id: cartItem.variant.id,
      label: cartItem.variant.label,
      optionType: cartItem.variant.optionType,
      optionValue: cartItem.variant.optionValue,
      stock: cartItem.variant.stockQuantity
    },
    quantity: cartItem.quantity,
    unitPrice: formatPrice(cartItem.product.price),
    subtotal: formatPrice(subtotal)
  };
}

function toCartResponse(cartItems: CartReadRecord[]): CartResponse {
  let total = new Prisma.Decimal(0);
  const items = cartItems.map((cartItem) => {
    total = total.plus(getCartItemSubtotal(cartItem));
    return toCartLineItemResponse(cartItem);
  });

  return {
    items,
    total: formatPrice(total)
  };
}

export async function addCartItem(
  userId: number,
  body: AddToCartBody
): Promise<CartItemResponse> {
  const cartItem = await prisma.$transaction(
    async (transaction) => {
      const [product, variant] = await Promise.all([
        transaction.product.findUnique({
          where: { id: body.productId },
          select: {
            id: true,
            type: true
          }
        }),
        transaction.productVariant.findUnique({
          where: { id: body.variantId },
          select: {
            id: true,
            productId: true,
            stockQuantity: true,
            isDefault: true
          }
        })
      ]);

      if (!product) {
        throw notFound("Product not found.");
      }

      if (!variant) {
        throw notFound("Product variant not found.");
      }

      if (variant.productId !== product.id) {
        throw badRequest("Product variant does not belong to product.");
      }

      if (product.type === ProductType.SIMPLE && !variant.isDefault) {
        throw badRequest("Simple products must use their default variant.");
      }

      const existingCartItem = await transaction.cartItem.findUnique({
        where: {
          userId_productId_variantId: {
            userId,
            productId: body.productId,
            variantId: body.variantId
          }
        },
        select: {
          id: true,
          quantity: true
        }
      });
      const nextQuantity = (existingCartItem?.quantity ?? 0) + body.quantity;

      if (nextQuantity > variant.stockQuantity) {
        throw conflict("Requested quantity exceeds available stock.");
      }

      if (existingCartItem) {
        return transaction.cartItem.update({
          where: { id: existingCartItem.id },
          data: {
            quantity: nextQuantity
          },
          select: cartItemSelect
        });
      }

      return transaction.cartItem.create({
        data: {
          userId,
          productId: body.productId,
          variantId: body.variantId,
          quantity: body.quantity
        },
        select: cartItemSelect
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  );

  return toCartItemResponse(cartItem);
}

export async function getCart(userId: number): Promise<CartResponse> {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    select: cartReadSelect,
    orderBy: {
      id: "asc"
    }
  });

  return toCartResponse(cartItems);
}

export async function updateCartItemQuantity(
  userId: number,
  cartItemId: number,
  body: UpdateCartQuantityBody
): Promise<CartResponse> {
  return prisma.$transaction(
    async (transaction) => {
      const cartItem = await transaction.cartItem.findFirst({
        where: {
          id: cartItemId,
          userId
        },
        select: {
          id: true,
          variant: {
            select: {
              stockQuantity: true
            }
          }
        }
      });

      if (!cartItem) {
        throw notFound("Cart item not found.");
      }

      if (body.quantity > cartItem.variant.stockQuantity) {
        throw conflict("Requested quantity exceeds available stock.");
      }

      await transaction.cartItem.update({
        where: { id: cartItem.id },
        data: {
          quantity: body.quantity
        },
        select: {
          id: true
        }
      });

      const cartItems = await transaction.cartItem.findMany({
        where: { userId },
        select: cartReadSelect,
        orderBy: {
          id: "asc"
        }
      });

      return toCartResponse(cartItems);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  );
}

export async function changeCartItemVariant(
  userId: number,
  cartItemId: number,
  body: ChangeCartVariantBody
): Promise<CartResponse> {
  return prisma.$transaction(
    async (transaction) => {
      const cartItem = await transaction.cartItem.findFirst({
        where: {
          id: cartItemId,
          userId
        },
        select: {
          id: true,
          productId: true,
          variantId: true,
          quantity: true
        }
      });

      if (!cartItem) {
        throw notFound("Cart item not found.");
      }

      const nextVariant = await transaction.productVariant.findUnique({
        where: { id: body.variantId },
        select: {
          id: true,
          productId: true,
          stockQuantity: true
        }
      });

      if (!nextVariant) {
        throw notFound("Product variant not found.");
      }

      if (nextVariant.productId !== cartItem.productId) {
        throw badRequest("Product variant does not belong to product.");
      }

      if (cartItem.quantity > nextVariant.stockQuantity) {
        throw conflict("Requested quantity exceeds available stock.");
      }

      if (cartItem.variantId === nextVariant.id) {
        const cartItems = await transaction.cartItem.findMany({
          where: { userId },
          select: cartReadSelect,
          orderBy: {
            id: "asc"
          }
        });

        return toCartResponse(cartItems);
      }

      const targetCartItem = await transaction.cartItem.findUnique({
        where: {
          userId_productId_variantId: {
            userId,
            productId: cartItem.productId,
            variantId: nextVariant.id
          }
        },
        select: {
          id: true,
          quantity: true
        }
      });

      if (targetCartItem) {
        const combinedQuantity = targetCartItem.quantity + cartItem.quantity;

        if (combinedQuantity > nextVariant.stockQuantity) {
          throw conflict("Requested quantity exceeds available stock.");
        }

        await transaction.cartItem.update({
          where: { id: targetCartItem.id },
          data: {
            quantity: combinedQuantity
          },
          select: {
            id: true
          }
        });

        await transaction.cartItem.delete({
          where: { id: cartItem.id },
          select: {
            id: true
          }
        });
      } else {
        await transaction.cartItem.update({
          where: { id: cartItem.id },
          data: {
            variantId: nextVariant.id
          },
          select: {
            id: true
          }
        });
      }

      const cartItems = await transaction.cartItem.findMany({
        where: { userId },
        select: cartReadSelect,
        orderBy: {
          id: "asc"
        }
      });

      return toCartResponse(cartItems);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  );
}

export async function removeCartItem(
  userId: number,
  cartItemId: number
): Promise<CartResponse> {
  return prisma.$transaction(
    async (transaction) => {
      const deletedCartItem = await transaction.cartItem.deleteMany({
        where: {
          id: cartItemId,
          userId
        }
      });

      if (deletedCartItem.count === 0) {
        throw notFound("Cart item not found.");
      }

      const cartItems = await transaction.cartItem.findMany({
        where: { userId },
        select: cartReadSelect,
        orderBy: {
          id: "asc"
        }
      });

      return toCartResponse(cartItems);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  );
}
