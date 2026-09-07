import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../infrastructure/database";
import {
  badRequest,
  conflict,
  notFound
} from "../../shared/errors/api-error";
import { formatPrice } from "../../shared/utilities/price";
import type {
  CartLineItemResponse,
  CartResponse
} from "../cart/cart.types";
import type {
  CheckoutOrderItemResponse,
  CheckoutOrderResponse,
  CheckoutValidationResponse
} from "./checkout.types";

const checkoutCartItemSelect = {
  id: true,
  productId: true,
  variantId: true,
  quantity: true
} satisfies Prisma.CartItemSelect;

type CheckoutCartItemRecord = Prisma.CartItemGetPayload<{
  select: typeof checkoutCartItemSelect;
}>;

const checkoutProductSelect = {
  id: true,
  title: true,
  price: true
} satisfies Prisma.ProductSelect;

type CheckoutProductRecord = Prisma.ProductGetPayload<{
  select: typeof checkoutProductSelect;
}>;

const checkoutVariantSelect = {
  id: true,
  productId: true,
  label: true,
  optionType: true,
  optionValue: true,
  stockQuantity: true
} satisfies Prisma.ProductVariantSelect;

type CheckoutVariantRecord = Prisma.ProductVariantGetPayload<{
  select: typeof checkoutVariantSelect;
}>;

type CheckoutReadClient = Pick<
  typeof prisma,
  "cartItem" | "product" | "productVariant"
>;

type ValidatedCheckoutItem = {
  id: number;
  product: Pick<CheckoutProductRecord, "id" | "title">;
  variant: CheckoutVariantRecord;
  quantity: number;
  unitPriceDecimal: Prisma.Decimal;
  subtotalDecimal: Prisma.Decimal;
};

type ValidatedCheckoutCart = {
  response: CheckoutValidationResponse;
  items: ValidatedCheckoutItem[];
  totalDecimal: Prisma.Decimal;
};

function indexById<TRecord extends { id: number }>(
  records: TRecord[]
): Map<number, TRecord> {
  return new Map(records.map((record) => [record.id, record]));
}

function toValidatedLineItemResponse(
  item: ValidatedCheckoutItem
): CartLineItemResponse {
  return {
    id: item.id,
    product: {
      id: item.product.id,
      title: item.product.title
    },
    variant: {
      id: item.variant.id,
      label: item.variant.label,
      optionType: item.variant.optionType,
      optionValue: item.variant.optionValue,
      stock: item.variant.stockQuantity
    },
    quantity: item.quantity,
    unitPrice: formatPrice(item.unitPriceDecimal),
    subtotal: formatPrice(item.subtotalDecimal)
  };
}

async function readCartItems(
  userId: number,
  database: CheckoutReadClient
): Promise<CheckoutCartItemRecord[]> {
  return database.cartItem.findMany({
    where: { userId },
    select: checkoutCartItemSelect,
    orderBy: {
      id: "asc"
    }
  });
}

async function readProducts(
  productIds: number[],
  database: CheckoutReadClient
): Promise<Map<number, CheckoutProductRecord>> {
  const products = await database.product.findMany({
    where: {
      id: {
        in: productIds
      }
    },
    select: checkoutProductSelect
  });

  return indexById(products);
}

async function readVariants(
  variantIds: number[],
  database: CheckoutReadClient
): Promise<Map<number, CheckoutVariantRecord>> {
  const variants = await database.productVariant.findMany({
    where: {
      id: {
        in: variantIds
      }
    },
    select: checkoutVariantSelect
  });

  return indexById(variants);
}

export async function validateCheckoutCart(
  userId: number,
  database: CheckoutReadClient = prisma
): Promise<ValidatedCheckoutCart> {
  const cartItems = await readCartItems(userId, database);

  if (cartItems.length === 0) {
    throw badRequest("Cannot checkout an empty cart.");
  }

  const productsById = await readProducts(
    [...new Set(cartItems.map((item) => item.productId))],
    database
  );
  const variantsById = await readVariants(
    [...new Set(cartItems.map((item) => item.variantId))],
    database
  );

  let totalDecimal = new Prisma.Decimal(0);
  const items = cartItems.map((cartItem) => {
    const product = productsById.get(cartItem.productId);

    if (!product) {
      throw notFound("Product not found.");
    }

    const variant = variantsById.get(cartItem.variantId);

    if (!variant) {
      throw notFound("Product variant not found.");
    }

    if (variant.productId !== product.id) {
      throw conflict("Product variant does not belong to product.");
    }

    if (cartItem.quantity > variant.stockQuantity) {
      throw conflict("Requested quantity exceeds available stock.");
    }

    const subtotalDecimal = product.price.mul(cartItem.quantity);
    totalDecimal = totalDecimal.plus(subtotalDecimal);

    return {
      id: cartItem.id,
      product: {
        id: product.id,
        title: product.title
      },
      variant,
      quantity: cartItem.quantity,
      unitPriceDecimal: product.price,
      subtotalDecimal
    };
  });

  const response: CartResponse = {
    items: items.map(toValidatedLineItemResponse),
    total: formatPrice(totalDecimal)
  };

  return {
    response,
    items,
    totalDecimal
  };
}

export async function validateCheckout(
  userId: number
): Promise<CheckoutValidationResponse> {
  const validatedCart = await validateCheckoutCart(userId);

  return validatedCart.response;
}

function toCheckoutOrderItemResponse(params: {
  id: number;
  productId: number;
  variantId: number;
  quantity: number;
  unitPrice: Prisma.Decimal;
  productTitleSnapshot: string;
  variantLabelSnapshot: string;
}): CheckoutOrderItemResponse {
  return {
    id: params.id,
    productId: params.productId,
    variantId: params.variantId,
    quantity: params.quantity,
    unitPrice: formatPrice(params.unitPrice),
    subtotal: formatPrice(params.unitPrice.mul(params.quantity)),
    productTitle: params.productTitleSnapshot,
    variantLabel: params.variantLabelSnapshot
  };
}

function isSerializableTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function checkout(userId: number): Promise<CheckoutOrderResponse> {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        const validatedCart = await validateCheckoutCart(userId, transaction);

        const order = await transaction.order.create({
          data: {
            userId,
            finalTotal: validatedCart.totalDecimal
          },
          select: {
            id: true,
            finalTotal: true,
            createdAt: true
          }
        });

        const orderItems: CheckoutOrderItemResponse[] = [];

        for (const item of validatedCart.items) {
          const stockUpdate = await transaction.productVariant.updateMany({
            where: {
              id: item.variant.id,
              productId: item.product.id,
              stockQuantity: {
                gte: item.quantity
              }
            },
            data: {
              stockQuantity: {
                decrement: item.quantity
              }
            }
          });

          if (stockUpdate.count !== 1) {
            throw conflict("Requested quantity exceeds available stock.");
          }

          const orderItem = await transaction.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.product.id,
              variantId: item.variant.id,
              quantity: item.quantity,
              unitPrice: item.unitPriceDecimal,
              productTitleSnapshot: item.product.title,
              variantLabelSnapshot: item.variant.label
            },
            select: {
              id: true,
              productId: true,
              variantId: true,
              quantity: true,
              unitPrice: true,
              productTitleSnapshot: true,
              variantLabelSnapshot: true
            }
          });

          orderItems.push(toCheckoutOrderItemResponse(orderItem));
        }

        await transaction.cartItem.deleteMany({
          where: { userId }
        });

        return {
          id: order.id,
          finalTotal: formatPrice(order.finalTotal),
          createdAt: order.createdAt.toISOString(),
          items: orderItems
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      }
    );
  } catch (error) {
    if (isSerializableTransactionConflict(error)) {
      throw conflict("Checkout could not be completed. Please try again.");
    }

    throw error;
  }
}
