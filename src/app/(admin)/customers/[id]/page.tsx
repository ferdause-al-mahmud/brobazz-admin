import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { Mail, Phone, ShoppingBag } from "lucide-react";
import { OrderStatusBadge, PaymentBadge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState, PageHeader } from "@/components/ui/Page";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { requireStaffPage } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { formatDate, formatTaka } from "@/lib/format";
import { Order } from "@/lib/models/Order";
import { User } from "@/lib/models/User";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  await requireStaffPage();
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  await connectToDatabase();
  const user = await User.findById(id).lean();
  if (!user) notFound();
  // Orders placed while signed in, plus guest orders from the same phone number.
  const orders = await Order.find({ $or: [{ user: user._id }, ...(user.phone ? [{ "customer.phone": user.phone }] : [])] })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  // Spend counts delivered orders only.
  const counted = orders.filter((order) => order.status === "delivered");
  const spent = counted.reduce((sum, order) => sum + order.total, 0);
  const addresses = [...new Set(orders.map((order) => order.customer.address))].slice(0, 3);

  return (
    <>
      <PageHeader back={{ href: "/customers", label: "Customers" }} description={`Customer since ${formatDate(user.createdAt)}`} title={user.name} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader description={`${orders.length} order${orders.length === 1 ? "" : "s"}`} title="Orders" />
          {orders.length === 0 ? (
            <EmptyState icon={<ShoppingBag />} title="No orders yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Items</Th>
                  <Th className="text-right">Total</Th>
                  <Th>Payment</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <Tr key={order.orderID}>
                    <Td>
                      <Link className="font-bold text-brand-primary hover:underline" href={`/orders/${order.orderID}`}>
                        #{order.orderID}
                      </Link>
                      <span className="block text-xs text-muted">{formatDate(order.createdAt)}</span>
                    </Td>
                    <Td className="max-w-64 truncate">{order.items.map((item) => item.name).join(", ")}</Td>
                    <Td className="text-right font-semibold tabular-nums">{formatTaka(order.total)}</Td>
                    <Td>
                      <PaymentBadge status={order.paymentStatus} />
                    </Td>
                    <Td>
                      <OrderStatusBadge status={order.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <aside className="grid gap-6">
          <Card>
            <CardHeader title="Contact" />
            <CardBody className="grid gap-2.5 text-sm">
              <a className="flex items-center gap-2.5 break-all text-brand-primary hover:underline" href={`mailto:${user.email}`}>
                <Mail className="size-4 shrink-0 text-muted" /> {user.email}
              </a>
              {user.phone && (
                <a className="flex items-center gap-2.5 text-brand-primary hover:underline" href={`tel:${user.phone}`}>
                  <Phone className="size-4 text-muted" /> {user.phone}
                </a>
              )}
              <p className="text-xs text-muted">Signs in with {user.googleId ? "Google" : "email and password"}</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Lifetime" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-muted">Spent (delivered)</dt>
                  <dd className="text-lg font-bold tabular-nums text-brand-ink">{formatTaka(spent)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Average order</dt>
                  <dd className="text-lg font-bold tabular-nums text-brand-ink">{formatTaka(counted.length ? spent / counted.length : 0)}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>
          {addresses.length > 0 && (
            <Card>
              <CardHeader title="Delivery addresses" />
              <CardBody className="grid gap-3 text-sm">
                {addresses.map((address) => (
                  <p className="whitespace-pre-line rounded-lg bg-surface-muted p-3" key={address}>
                    {address}
                  </p>
                ))}
              </CardBody>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
