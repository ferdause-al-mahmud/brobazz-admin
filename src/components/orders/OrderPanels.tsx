"use client";

import { useState } from "react";
import { Pencil, Truck } from "lucide-react";
import { orderStatusMeta } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Modal, useAction } from "@/components/ui/client";
import {
  updateAdminNote,
  updateCourier,
  updateOrderCustomer,
  updateOrderStatus,
  updatePaymentStatus,
} from "@/lib/actions/orders";
import { cn } from "@/lib/cn";
import { PAYMENT_STATUSES, RESTOCKING_STATUSES, type OrderStatus, type PaymentStatus } from "@/lib/store-definitions";

// The usual next step for each status, offered as the primary button.
const NEXT_STEP: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "shipped",
  shipped: "delivered",
};

const STEP_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirm order",
  processing: "Start packing",
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
};

export function StatusPanel({ orderID, status, restocked }: { orderID: number; status: OrderStatus; restocked: boolean }) {
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");
  const { pending, run } = useAction();
  const next = NEXT_STEP[status];

  const open = (value: OrderStatus) => {
    setNote("");
    setTarget(value);
  };

  return (
    <Card>
      <CardHeader title="Fulfilment" />
      <CardBody className="grid gap-3">
        {next && (
          <Button className="w-full" onClick={() => open(next)} variant={next === "delivered" ? "gold" : "primary"}>
            {next === "shipped" && <Truck />}
            {STEP_LABEL[next]}
          </Button>
        )}
        {!restocked && (
          <div className="flex justify-center">
            {/* Cancel before it ships; once it's with the courier or the customer, it's a return. */}
            {["pending", "confirmed", "processing"].includes(status) && (
              <Button onClick={() => open("cancelled")} size="sm" variant="danger-ghost">
                Cancel order
              </Button>
            )}
            {["shipped", "delivered"].includes(status) && (
              <Button onClick={() => open("returned")} size="sm" variant="danger-ghost">
                Mark returned
              </Button>
            )}
          </div>
        )}
        <details className="text-xs text-muted">
          <summary className="cursor-pointer font-semibold hover:text-brand-ink">Set any status</summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(orderStatusMeta) as OrderStatus[])
              .filter((value) => value !== status && (!restocked || RESTOCKING_STATUSES.includes(value)))
              .map((value) => (
                <button
                  className="rounded-md border border-line-strong px-2 py-1 font-semibold text-brand-ink hover:border-brand-primary"
                  key={value}
                  onClick={() => open(value)}
                  type="button"
                >
                  {orderStatusMeta[value].label}
                </button>
              ))}
          </div>
        </details>
        {restocked && <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">Items from this order were returned to stock.</p>}
      </CardBody>

      <Modal
        description={
          target && RESTOCKING_STATUSES.includes(target) && !restocked
            ? "The items go back into stock. The order can't be reopened afterwards."
            : target === "delivered"
              ? "Cash-on-delivery orders are marked paid at the same time."
              : undefined
        }
        footer={
          <>
            <Button onClick={() => setTarget(null)} variant="secondary">
              Back
            </Button>
            <Button
              loading={pending}
              onClick={() => target && run(() => updateOrderStatus(orderID, target, note), { onSuccess: () => setTarget(null) })}
              variant={target && RESTOCKING_STATUSES.includes(target) ? "danger" : "primary"}
            >
              Mark {target ? orderStatusMeta[target].label.toLowerCase() : ""}
            </Button>
          </>
        }
        onClose={() => setTarget(null)}
        open={target !== null}
        size="sm"
        title={target ? `Mark order #${orderID} ${orderStatusMeta[target].label.toLowerCase()}?` : ""}
      >
        <Field hint="Saved in the order's history." htmlFor="status-note" label="Note" optional>
          <Textarea className="min-h-20" id="status-note" onChange={(event) => setNote(event.target.value)} placeholder="e.g. Customer confirmed by phone" value={note} />
        </Field>
      </Modal>
    </Card>
  );
}

export function PaymentPanel({ orderID, paymentStatus }: { orderID: number; paymentStatus: PaymentStatus }) {
  const { pending, run } = useAction();
  return (
    <Field htmlFor="payment" label="Payment status">
      <Select
        disabled={pending}
        id="payment"
        onChange={(event) => run(() => updatePaymentStatus(orderID, event.target.value as PaymentStatus))}
        value={paymentStatus}
      >
        {PAYMENT_STATUSES.map((value) => (
          <option key={value} value={value}>
            {value[0].toUpperCase() + value.slice(1)}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function CourierPanel({
  orderID,
  courier,
}: {
  orderID: number;
  courier: { name: string; trackingNumber: string; trackingUrl: string };
}) {
  const [value, setValue] = useState(courier);
  const { pending, run } = useAction();
  const changed = JSON.stringify(value) !== JSON.stringify(courier);

  return (
    <Card>
      <CardHeader description="Shown to the team; share the tracking link with the customer." title="Courier" />
      <CardBody className="grid gap-3">
        <Field htmlFor="courier-name" label="Courier">
          <Input id="courier-name" list="couriers" onChange={(event) => setValue({ ...value, name: event.target.value })} placeholder="Steadfast, Pathao, RedX…" value={value.name} />
          <datalist id="couriers">
            {["Steadfast", "Pathao", "RedX", "Paperfly", "Sundarban", "eCourier"].map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>
        <Field htmlFor="courier-tracking" label="Tracking / consignment ID">
          <Input id="courier-tracking" onChange={(event) => setValue({ ...value, trackingNumber: event.target.value })} value={value.trackingNumber} />
        </Field>
        <Field htmlFor="courier-url" label="Tracking link" optional>
          <Input id="courier-url" onChange={(event) => setValue({ ...value, trackingUrl: event.target.value })} placeholder="https://" value={value.trackingUrl} />
        </Field>
        <Button disabled={!changed} loading={pending} onClick={() => run(() => updateCourier(orderID, value))} size="sm" variant="secondary">
          Save courier details
        </Button>
      </CardBody>
    </Card>
  );
}

export function NotePanel({ orderID, note }: { orderID: number; note: string }) {
  const [value, setValue] = useState(note);
  const { pending, run } = useAction();
  return (
    <Card>
      <CardHeader description="Only staff can see this." title="Internal note" />
      <CardBody className="grid gap-2">
        <Textarea aria-label="Internal note" className="min-h-24" onChange={(event) => setValue(event.target.value)} value={value} />
        <Button className={cn(value === note && "hidden")} loading={pending} onClick={() => run(() => updateAdminNote(orderID, value))} size="sm" variant="secondary">
          Save note
        </Button>
      </CardBody>
    </Card>
  );
}

export function EditCustomerButton({
  orderID,
  customer,
}: {
  orderID: number;
  customer: { name: string; phone: string; email: string; address: string };
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(customer);
  const { pending, run } = useAction();

  return (
    <>
      <Button aria-label="Edit customer details" onClick={() => setOpen(true)} size="icon" variant="ghost">
        <Pencil />
      </Button>
      <Modal
        footer={
          <>
            <Button onClick={() => setOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button loading={pending} onClick={() => run(() => updateOrderCustomer(orderID, value), { onSuccess: () => setOpen(false) })}>
              Save
            </Button>
          </>
        }
        onClose={() => setOpen(false)}
        open={open}
        title="Delivery details"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="cust-name" label="Name">
            <Input id="cust-name" onChange={(event) => setValue({ ...value, name: event.target.value })} value={value.name} />
          </Field>
          <Field htmlFor="cust-phone" label="Phone">
            <Input id="cust-phone" inputMode="tel" onChange={(event) => setValue({ ...value, phone: event.target.value })} value={value.phone} />
          </Field>
          <Field className="sm:col-span-2" htmlFor="cust-email" label="Email" optional>
            <Input id="cust-email" onChange={(event) => setValue({ ...value, email: event.target.value })} type="email" value={value.email} />
          </Field>
          <Field className="sm:col-span-2" htmlFor="cust-address" label="Address">
            <Textarea id="cust-address" onChange={(event) => setValue({ ...value, address: event.target.value })} value={value.address} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
