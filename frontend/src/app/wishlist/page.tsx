import { ProtectedPlaceholder } from "@/features/auth/ProtectedPlaceholder";

export default function WishlistPage(): React.ReactElement {
  return (
    <ProtectedPlaceholder
      description="Wishlist functionality will be added in a later task."
      eyebrow="Protected"
      title="Wishlist workspace"
    />
  );
}
