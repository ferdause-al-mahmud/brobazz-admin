import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone, Printer, StickyNote, UserRound } from "lucide-react";
import { CourierBooking } from "@/components/orders/CourierBooking";
import { CustomerRecordButton } from "@/components/orders/CustomerRecord";
import { DeleteOrderButton } from "@/components/orders/DeleteOrderButton";
import { EditCustomerButton, NotePanel, PaymentPanel, StatusPanel } from "@/components/orders/OrderPanels";
import { OrderStatusBadge, PaymentBadge, orderStatusMeta } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { courierConfigured, courierOutcome } from "@/lib/couriers";
import { connectToDatabase } from "@/lib/db";
import { formatDate, formatTaka } from "@/lib/format";
import { Order } from "@/lib/models/Order";

export async function generateMetadata({ params }: PageProps<"/orders/[orderID]">): Promise<Metadata> {
  return { title: `Order #${(await params).orderID}` };
}

export default async function OrderPage({ params }: PageProps<"/orders/[orderID]">) {
  const user = await requireStaffPage();
  const orderID = Number((await params).orderID);
  if (!Number.isInteger(orderID)) notFound();

  await connectToDatabase();
  const order = await Order.findOne({ orderID }).lean();
  if (!order) notFound();

  const [previousOrders] = await Promise.all([
    Order.countDocuments({ "customer.phone": order.customer.phone, orderID: { $ne: orderID } }),
  ]);
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const history = [...(order.statusHistory ?? [])].reverse();

  return (
    <>
      <PageHeader
        actions={
          <>
            {user.role === "admin" && (
              <DeleteOrderButton canRestock={!order.restockedAt && order.status !== "delivered"} orderID={orderID} />
            )}
            <ButtonLink href={`/orders/${orderID}/invoice`} target="_blank" variant="secondary">
              <Printer /> Invoice
            </ButtonLink>
          </>
        }
        back={{ href: "/orders", label: "Orders" }}
        description={
          order.source === "admin"
            ? `Entered by ${order.createdBy ?? "staff"} ${formatDate(order.createdAt, true)}${order.channel ? ` · via ${order.channel}` : ""}`
            : `Placed ${formatDate(order.createdAt, true)} · ${order.user ? "signed-in customer" : "guest checkout"}`
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            Order #{orderID} <OrderStatusBadge status={order.status} /> <PaymentBadge status={order.paymentStatus} />
          </span>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-6">
          <Card>
            <CardHeader description={`${units} unit${units === 1 ? "" : "s"}`} title="Items" />
            <ul className="divide-y divide-line">
              {order.items.map((item, index) => (
                <li className="flex items-center gap-4 px-5 py-3" key={`${item.productId}-${item.variantId ?? index}`}>
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted">
                    {item.image && <Image alt="" className="object-cover" fill sizes="56px" src={item.image} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link className="font-semibold text-brand-ink hover:text-brand-primary" href={`/products/${encodeURIComponent(item.productId)}`}>
                      {item.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {[item.variantLabel || (item.selectedSize && `Size ${item.selectedSize}`), item.sku || item.productId].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-muted">
                    {formatTaka(item.price)} × {item.quantity}
                  </span>
                  <span className="w-24 text-right font-semibold tabular-nums">{formatTaka(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="grid gap-2 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between text-muted">
                <dt>Subtotal</dt>
                <dd className="tabular-nums text-brand-ink">{formatTaka(order.subtotal)}</dd>
              </div>
              {order.couponDiscount > 0 && (
                <div className="flex justify-between text-muted">
                  <dt>Coupon {order.couponCode}</dt>
                  <dd className="tabular-nums text-good">−{formatTaka(order.couponDiscount)}</dd>
                </div>
              )}
              {(order.discount ?? 0) > 0 && (
                <div className="flex justify-between text-muted">
                  <dt>Discount</dt>
                  <dd className="tabular-nums text-good">−{formatTaka(order.discount ?? 0)}</dd>
                </div>
              )}
              <div className="flex justify-between text-muted">
                <dt>Delivery · {order.shippingLabel ?? order.shippingOption}</dt>
                <dd className="tabular-nums text-brand-ink">{order.shippingCost ? formatTaka(order.shippingCost) : "Free"}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-brand-ink">
                <dt>Total · cash on delivery</dt>
                <dd className="tabular-nums">{formatTaka(order.total)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Timeline" />
            <CardBody>
              <ol className="relative grid gap-5 border-l border-line pl-5">
                {history.map((entry, index) => (
                  <li className="relative" key={index}>
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[26px] top-1 size-3 rounded-full border-2 border-surface ${index === 0 ? "bg-brand-primary" : "bg-line-strong"}`}
                    />
                    <p className="text-sm font-semibold text-brand-ink">{orderStatusMeta[entry.status].label}</p>
                    <p className="text-xs text-muted">
                      {formatDate(entry.at ?? order.createdAt, true)}
                      {entry.by && ` · ${entry.by}`}
                    </p>
                    {entry.note && <p className="mt-1 text-sm text-brand-ink/80">{entry.note}</p>}
                  </li>
                ))}
                {history.length === 0 && (
                  <li className="text-sm text-muted">Placed {formatDate(order.createdAt, true)}</li>
                )}
              </ol>
            </CardBody>
          </Card>
        </div>

        <aside className="grid gap-6">
          <StatusPanel orderID={orderID} restocked={Boolean(order.restockedAt)} status={order.status} />

          <Card>
            <CardHeader
              actions={
                <EditCustomerButton
                  customer={{
                    name: order.customer.name,
                    phone: order.customer.phone,
                    email: order.customer.email ?? "",
                    address: order.customer.address,
                  }}
                  orderID={orderID}
                />
              }
              title="Customer"
            />
            <CardBody className="grid gap-3 text-sm">
              <p className="flex items-center gap-2.5 font-semibold">
                <UserRound className="size-4 text-muted" /> {order.customer.name}
              </p>
              <a className="flex items-center gap-2.5 text-brand-primary hover:underline" href={`tel:${order.customer.phone}`}>
                <Phone className="size-4 text-muted" /> {order.customer.phone}
              </a>
              {order.customer.email && (
                <a className="flex items-center gap-2.5 break-all text-brand-primary hover:underline" href={`mailto:${order.customer.email}`}>
                  <Mail className="size-4 shrink-0 text-muted" /> {order.customer.email}
                </a>
              )}
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted" /> <span className="whitespace-pre-line">{order.customer.address}</span>
              </p>
              {order.customer.notes && (
                <p className="flex items-start gap-2.5 rounded-lg bg-brand-secondary/10 p-2.5 text-[13px]">
                  <StickyNote className="mt-0.5 size-4 shrink-0 text-[#8a6a1f]" /> {order.customer.notes}
                </p>
              )}
              <p className="text-xs text-muted">
                {previousOrders ? (
                  <Link className="hover:text-brand-primary hover:underline" href={`/orders?q=${order.customer.phone}`}>
                    {previousOrders} other order{previousOrders === 1 ? "" : "s"} from this number
                  </Link>
                ) : (
                  "First order from this number"
                )}
              </p>
              <CustomerRecordButton phone={order.customer.phone} />
              <PaymentPanel orderID={orderID} paymentStatus={order.paymentStatus} />
            </CardBody>
          </Card>

          <CourierBooking
            address={order.customer.address}
            bookable={!["delivered", "cancelled", "returned"].includes(order.status)}
            codAmount={order.paymentStatus === "paid" ? 0 : order.total}
            configured={{ pathao: courierConfigured("pathao"), steadfast: courierConfigured("steadfast") }}
            courier={{
              name: order.courier?.name ?? "",
              provider: order.courier?.provider ?? null,
              trackingNumber: order.courier?.trackingNumber ?? "",
              trackingUrl: order.courier?.trackingUrl ?? "",
              bookedAt: order.courier?.bookedAt?.toISOString() ?? null,
              deliveryFee: order.courier?.deliveryFee ?? null,
              status: order.courier?.status ?? "",
              statusCheckedAt: order.courier?.statusCheckedAt?.toISOString() ?? null,
            }}
            customerNote={order.customer.notes ?? ""}
            orderID={orderID}
            outcome={order.courier?.status && !["delivered", "returned"].includes(order.status) ? courierOutcome(order.courier.status) : null}
          />
          <NotePanel note={order.adminNote ?? ""} orderID={orderID} />
        </aside>
      </div>
    </>
  );
}
