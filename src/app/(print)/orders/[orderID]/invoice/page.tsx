import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PrintButton } from "./PrintButton";
import { requireStaffPage } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { formatDate, formatTaka } from "@/lib/format";
import { Order } from "@/lib/models/Order";
import { STORE_SETTINGS_ID, StoreSettings } from "@/lib/models/StoreSettings";

export async function generateMetadata({ params }: PageProps<"/orders/[orderID]/invoice">): Promise<Metadata> {
  return { title: `Invoice #${(await params).orderID}` };
}

export default async function InvoicePage({ params }: PageProps<"/orders/[orderID]/invoice">) {
  await requireStaffPage();
  const orderID = Number((await params).orderID);
  if (!Number.isInteger(orderID)) notFound();

  await connectToDatabase();
  const [order, settings] = await Promise.all([
    Order.findOne({ orderID }).lean(),
    StoreSettings.findById(STORE_SETTINGS_ID).lean(),
  ]);
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-sm text-brand-ink print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <header className="flex items-start justify-between gap-6 border-b border-line pb-6">
        <div className="flex items-center gap-3">
          <Image alt="" height={48} src="/logo.png" width={48} />
          <div>
            <p className="text-lg font-bold">{settings?.storeName || "Brobazz"}</p>
            <p className="text-xs text-muted">{[settings?.supportPhone, settings?.supportEmail].filter(Boolean).join(" · ")}</p>
            {settings?.address && <p className="text-xs text-muted">{settings.address}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">Invoice</p>
          <p className="text-muted">#{order.orderID}</p>
          <p className="text-muted">{formatDate(order.createdAt)}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6 py-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Deliver to</p>
          <p className="mt-1 font-semibold">{order.customer.name}</p>
          <p>{order.customer.phone}</p>
          <p className="whitespace-pre-line">{order.customer.address}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Delivery</p>
          <p className="mt-1">{order.shippingLabel ?? order.shippingOption}</p>
          {order.courier?.name && (
            <p>
              {order.courier.name} {order.courier.trackingNumber}
            </p>
          )}
          <p className="mt-2 font-semibold">{order.paymentStatus === "paid" ? "Paid" : "Cash on delivery"}</p>
        </div>
      </section>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y border-line text-left text-[11px] uppercase tracking-widest text-muted">
            <th className="py-2">Item</th>
            <th className="py-2 text-right">Price</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr className="border-b border-line" key={index}>
              <td className="py-2.5">
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-muted">{[item.variantLabel, item.sku || item.productId].filter(Boolean).join(" · ")}</p>
              </td>
              <td className="py-2.5 text-right tabular-nums">{formatTaka(item.price)}</td>
              <td className="py-2.5 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2.5 text-right tabular-nums">{formatTaka(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="ml-auto mt-4 grid w-64 gap-1.5">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="tabular-nums">{formatTaka(order.subtotal)}</dd>
        </div>
        {order.couponDiscount > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted">Discount ({order.couponCode})</dt>
            <dd className="tabular-nums">−{formatTaka(order.couponDiscount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted">Delivery</dt>
          <dd className="tabular-nums">{formatTaka(order.shippingCost)}</dd>
        </div>
        <div className="flex justify-between border-t border-brand-ink pt-1.5 text-base font-bold">
          <dt>{order.paymentStatus === "paid" ? "Total paid" : "Amount to collect"}</dt>
          <dd className="tabular-nums">{formatTaka(order.total)}</dd>
        </div>
      </dl>

      {order.customer.notes && (
        <p className="mt-8 rounded-lg border border-line p-3 text-xs">
          <span className="font-semibold">Customer note: </span>
          {order.customer.notes}
        </p>
      )}
      <p className="mt-10 text-center text-xs text-muted">Thank you for shopping with {settings?.storeName || "Brobazz"}.</p>
    </main>
  );
}
