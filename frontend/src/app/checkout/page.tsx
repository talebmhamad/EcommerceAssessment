import { ProtectedPlaceholder } from "@/features/auth/ProtectedPlaceholder";

export default function CheckoutPage(): React.ReactElement {
  return (
    <ProtectedPlaceholder
      description="Checkout functionality will be added in a later task."
      eyebrow="Protected"
      title="Checkout workspace"
    />
  );
}
