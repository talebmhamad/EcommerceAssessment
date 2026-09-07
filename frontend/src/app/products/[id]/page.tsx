import { ProductDetailView } from "@/features/products/ProductDetailView";

type ProductDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductDetailPage({
  params
}: ProductDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;

  return <ProductDetailView productId={id} />;
}
