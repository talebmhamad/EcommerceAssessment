import type { Cart, CartItem, CartLineItem } from "@/types/cart";
import type { ProductVariantListItem } from "@/types/products";

function formatRawPrice(price: number): string {
  return price.toFixed(2);
}

export function mergeCartItem(
  cart: Cart | undefined,
  cartItem: CartItem,
  product: {
    id: number;
    price: string;
    title: string;
  },
  variant: ProductVariantListItem
): Cart | undefined {
  if (!cart) {
    return cart;
  }

  const unitPrice = Number(product.price);
  let didUpdateExistingLine = false;
  const nextItems = cart.items.map((item): CartLineItem => {
    if (item.id !== cartItem.id) {
      return item;
    }

    didUpdateExistingLine = true;

    return {
      ...item,
      quantity: cartItem.quantity,
      subtotal: formatRawPrice(unitPrice * cartItem.quantity),
      variant: {
        id: variant.id,
        label: variant.label,
        optionType: variant.optionType,
        optionValue: variant.optionValue,
        stock: variant.stock
      }
    };
  });

  if (!didUpdateExistingLine) {
    nextItems.push({
      id: cartItem.id,
      product: {
        id: product.id,
        title: product.title
      },
      quantity: cartItem.quantity,
      subtotal: formatRawPrice(unitPrice * cartItem.quantity),
      unitPrice: formatRawPrice(unitPrice),
      variant: {
        id: variant.id,
        label: variant.label,
        optionType: variant.optionType,
        optionValue: variant.optionValue,
        stock: variant.stock
      }
    });
  }

  const total = nextItems.reduce(
    (sum, item) => sum + Number(item.subtotal),
    0
  );

  return {
    items: nextItems,
    total: formatRawPrice(total)
  };
}
