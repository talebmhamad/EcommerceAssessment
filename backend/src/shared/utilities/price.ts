import type { Prisma } from "../../generated/prisma/client";

export function formatPrice(price: Prisma.Decimal): string {
  return price.toFixed(2);
}
