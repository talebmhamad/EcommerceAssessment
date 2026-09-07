import { OrderConfirmationView } from "@/features/orders/OrderConfirmationView";

type OrderConfirmationPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function OrderConfirmationPage({
  params
}: OrderConfirmationPageProps): Promise<React.ReactElement> {
  const { orderId } = await params;

  return <OrderConfirmationView orderId={orderId} />;
}
