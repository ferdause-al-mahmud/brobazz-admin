import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExchangeForm } from "@/components/orders/ExchangeForm";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/settings";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { exchangedQuantities, getPickerProducts } from "@/lib/order-create";

export async function generateMetadata({ params }: PageProps<"/orders/[orderID]/exchange">): Promise<Metadata> {
  return { title: `Exchange · order #${(await params).orderID}` };
}

export default async function ExchangePage({ params }: PageProps<"/orders/[orderID]/exchange">) {
  await requireStaffPage();
  const orderID = Number((await params).orderID);
  if (!Number.isInteger(orderID)) notFound();

  await connectToDatabase();
  const order = await Order.findOne({ orderID }).lean();
  if (!order) notFound();

  const header = (
    <PageHeader
      back={{ href: `/orders/${orderID}`, label: `Order #${orderID}` }}
      description={`${order.customer.name} · ${order.customer.phone}. Creates a new order that delivers the replacement and collects the old item, ready to book with the courier.`}
      title="Create exchange"
    />
  );

  if (order.status !== "delivered") {
    return (
      <>
        {header}
        <Card>
          <CardBody className="grid justify-items-start gap-3 text-sm">
            <p>Only delivered orders can be exchanged. This order is {order.status}.</p>
            <ButtonLink href={`/orders/${orderID}`} variant="secondary">
              Back to the order
            </ButtonLink>
          </CardBody>
        </Card>
      </>
    );
  }

  const [products, settings, taken] = await Promise.all([getPickerProducts(), getSettings(), exchangedQuantities(orderID)]);

  return (
    <>
      {header}
      <ExchangeForm
        defaultShipping={order.shippingOption}
        items={order.items.map((item, index) => ({
          index,
          productId: item.productId,
          variantId: item.variantId ?? null,
          name: item.name,
          variantLabel: item.variantLabel ?? item.selectedSize ?? "",
          image: item.image ?? null,
          price: item.price,
          quantity: item.quantity,
          available: Math.max(0, item.quantity - (taken.get(index) ?? 0)),
        }))}
        orderID={orderID}
        products={products}
        shippingOptions={settings.shippingOptions.filter((option) => option.isActive).map(({ value, label, cost }) => ({ value, label, cost }))}
      />
    </>
  );
}
