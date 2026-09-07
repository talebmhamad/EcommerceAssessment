import type { ProductType, VariantOptionType } from "../../generated/prisma/client";

export type ProductVariantListItemResponse = {
  id: number;
  label: string;
  optionType: VariantOptionType | null;
  optionValue: string | null;
  stock: number;
};

export type ProductListItemResponse = {
  id: number;
  title: string;
  price: string;
  type: ProductType;
  variants: ProductVariantListItemResponse[];
};

export type ProductDetailResponse = {
  id: number;
  title: string;
  price: string;
  description: string;
  type: ProductType;
  totalStock: number;
  variants: ProductVariantListItemResponse[];
};
