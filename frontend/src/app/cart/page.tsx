import { ProtectedPlaceholder } from "@/features/auth/ProtectedPlaceholder";

export default function CartPage(): React.ReactElement {
  return (
    <ProtectedPlaceholder
      description="Cart functionality will be added in a later task."
      eyebrow="Protected"
      title="Cart workspace"
    />
  );
}
