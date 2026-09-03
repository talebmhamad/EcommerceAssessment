import { ProtectedPlaceholder } from "@/features/auth/ProtectedPlaceholder";

export default function ProductsPage(): React.ReactElement {
  return (
    <ProtectedPlaceholder
      description="Product browsing will be added in the product API phase."
      eyebrow="Protected"
      title="Products workspace"
    />
  );
}
