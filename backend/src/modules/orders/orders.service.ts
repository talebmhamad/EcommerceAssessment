import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../infrastructure/database";
import { notFound } from "../../shared/errors/api-error";
import { formatPrice } from "../../shared/utilities/price";
import type {
  OrderItemResponse,
  OrderResponse
} from "./orders.types";

const orderSelect = {
  id: true,
  finalTotal: true,
  createdAt: true,
  orderItems: {
    select: {
      id: true,
      productId: true,
      variantId: true,
      quantity: true,
      unitPrice: true,
      productTitleSnapshot: true,
      variantLabelSnapshot: true
    },
    orderBy: {
      id: "asc"
    }
  }
} satisfies Prisma.OrderSelect;

type OrderRecord = Prisma.OrderGetPayload<{
  select: typeof orderSelect;
}>;

function toOrderItemResponse(
  item: OrderRecord["orderItems"][number]
): OrderItemResponse {
  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    unitPrice: formatPrice(item.unitPrice),
    subtotal: formatPrice(item.unitPrice.mul(item.quantity)),
    productTitle: item.productTitleSnapshot,
    variantLabel: item.variantLabelSnapshot
  };
}

function toOrderResponse(order: OrderRecord): OrderResponse {
  return {
    id: order.id,
    finalTotal: formatPrice(order.finalTotal),
    createdAt: order.createdAt.toISOString(),
    items: order.orderItems.map(toOrderItemResponse)
  };
}

export async function getOrderByIdForUser(
  userId: number,
  orderId: number
): Promise<OrderResponse> {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId
    },
    select: orderSelect
  });

  if (!order) {
    throw notFound("Order not found.");
  }

  return toOrderResponse(order);
}
