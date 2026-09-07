export type ProductType = "SIMPLE" | "CONFIGURABLE";

export type VariantOptionType = "SIZE" | "COLOR";

export type ProductVariantListItem = {
  id: number;
  label: string;
  optionType: VariantOptionType | null;
  optionValue: string | null;
  stock: number;
};

export type ProductListItem = {
  id: number;
  title: string;
  price: string;
  type: ProductType;
  variants: ProductVariantListItem[];
};

export type ProductDetail = {
  id: number;
  title: string;
  price: string;
  description: string;
  type: ProductType;
  totalStock: number;
  variants: ProductVariantListItem[];
};
