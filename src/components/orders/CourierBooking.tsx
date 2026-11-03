"use client";

import { useState, useTransition } from "react";
import {
  ExternalLink,
  LoaderCircle,
  MapPin,
  PackageCheck,
  RefreshCw,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  Checkbox,
  Field,
  Input,
  PrefixInput,
  Textarea,
} from "@/components/ui/Field";
import { Modal, useAction } from "@/components/ui/client";
import {
  bookCourier,
  locateForPathao,
  refreshCourierStatus,
} from "@/lib/actions/couriers";
import { formatDate, formatTaka } from "@/lib/format";
import type { CourierProvider, PathaoLocation } from "@/lib/couriers";
// import { CourierPanel } from "./OrderPanels";

const names: Record<CourierProvider, string> = {
  pathao: "Pathao",
  steadfast: "Steadfast",
};

export type CourierInfo = {
  name: string;
  provider: CourierProvider | null;
  trackingNumber: string;
  trackingUrl: string;
  bookedAt: string | null;
  deliveryFee: number | null;
  status: string;
  statusCheckedAt: string | null;
};

export function CourierBooking({
  orderID,
  courier,
  codAmount,
  address,
  customerNote,
  bookable,
  configured,
  outcome,
}: {
  orderID: number;
  courier: CourierInfo;
  /** What the courier should collect (order total, or 0 when already paid). */
  codAmount: number;
  address: string;
  customerNote: string;
  /** False once the order is delivered, cancelled or returned. */
  bookable: boolean;
  configured: Record<CourierProvider, boolean>;
  /** What the courier's last status means for the order, worked out on the server. */
  outcome: "delivered" | "returned" | null;
}) {
  const [provider, setProvider] = useState<CourierProvider | null>(null);
  const { pending, run } = useAction();

  if (courier.provider && courier.trackingNumber) {
    return (
      <Card>
        <CardHeader
          actions={
            <Button
              loading={pending}
              onClick={() => run(() => refreshCourierStatus(orderID))}
              size="xs"
              variant="secondary"
            >
              {!pending && <RefreshCw />} Check status
            </Button>
          }
          title={`Courier · ${names[courier.provider]}`}
        />
        <CardBody className="grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Consignment</span>
            <span className="font-mono font-semibold">
              {courier.trackingNumber}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Courier status</span>
            <Badge
              dot
              tone={
                outcome === "delivered"
                  ? "good"
                  : outcome === "returned"
                    ? "bad"
                    : "info"
              }
            >
              {courier.status.replaceAll("_", " ") || "Unknown"}
            </Badge>
          </div>
          {courier.statusCheckedAt && (
            <p className="text-right text-[11px] text-muted">
              Checked {formatDate(courier.statusCheckedAt, true)}
            </p>
          )}
          {courier.deliveryFee !== null && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted">Delivery fee</span>
              <span className="font-semibold">
                {formatTaka(courier.deliveryFee)}
              </span>
            </div>
          )}
          {courier.bookedAt && (
            <p className="text-xs text-muted">
              Booked {formatDate(courier.bookedAt, true)}
            </p>
          )}
          {outcome && (
            <p className="rounded-lg bg-brand-secondary/10 p-2.5 text-xs text-brand-ink">
              {names[courier.provider]} reports this parcel as {outcome}. Update
              the order status in Fulfilment above.
            </p>
          )}
          {courier.trackingUrl && (
            <a
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline"
              href={courier.trackingUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-3.5" /> Open tracking page
            </a>
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          description="Book the parcel straight from here; the consignment ID is saved on the order."
          title="Send to courier"
        />
        <CardBody className="grid gap-2">
          {bookable ? (
            <div className="grid grid-cols-2 gap-2">
              {(["steadfast", "pathao"] as const).map((value) => (
                <Button
                  disabled={!configured[value]}
                  key={value}
                  onClick={() => setProvider(value)}
                  title={
                    configured[value]
                      ? undefined
                      : `Add the ${names[value]} keys to the admin's .env`
                  }
                  variant="secondary"
                >
                  <Truck /> {names[value]}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">
              This order can no longer be sent to a courier.
            </p>
          )}
          {bookable && (!configured.pathao || !configured.steadfast) && (
            <p className="text-[11px] text-muted">
              {[
                !configured.steadfast &&
                  "Steadfast needs STEADFAST_API_KEY and STEADFAST_SECRET_KEY",
                !configured.pathao &&
                  "Pathao needs PATHAO_TOKEN and PATHAO_STORE_ID",
              ]
                .filter(Boolean)
                .join(". ")}{" "}
              in the admin&apos;s .env.
            </p>
          )}
        </CardBody>
      </Card>
      {/* Couriers without an integration: record the details by hand. */}
      {/* <details className="group">
        <summary className="cursor-pointer px-1 text-xs font-semibold text-muted hover:text-brand-ink">Using another courier?</summary>
        <div className="mt-3">
          <CourierPanel courier={{ name: courier.name, trackingNumber: courier.trackingNumber, trackingUrl: courier.trackingUrl }} orderID={orderID} />
        </div>
      </details> */}
      {provider && (
        <BookingDialog
          address={address}
          codAmount={codAmount}
          customerNote={customerNote}
          onClose={() => setProvider(null)}
          orderID={orderID}
          provider={provider}
        />
      )}
    </>
  );
}

function BookingDialog({
  orderID,
  provider,
  codAmount,
  address,
  customerNote,
  onClose,
}: {
  orderID: number;
  provider: CourierProvider;
  codAmount: number;
  address: string;
  customerNote: string;
  onClose: () => void;
}) {
  const [cod, setCod] = useState(codAmount);
  const [note, setNote] = useState(customerNote);
  const [weight, setWeight] = useState(0.5);
  const [markShipped, setMarkShipped] = useState(true);
  const [searchAddress, setSearchAddress] = useState(address);
  const [location, setLocation] = useState<PathaoLocation | null>(null);
  const [locating, startLocating] = useTransition();
  const [locateError, setLocateError] = useState<string | null>(null);
  const { pending, run } = useAction();

  const locate = (text: string) =>
    startLocating(async () => {
      setLocateError(null);
      const result = await locateForPathao(text);
      if (result.ok) setLocation(result.data);
      else {
        setLocation(null);
        setLocateError(result.error);
      }
    });

  // Pathao needs the delivery area; look it up as soon as the dialog opens.
  const [started, setStarted] = useState(false);
  if (provider === "pathao" && !started) {
    setStarted(true);
    locate(address);
  }

  return (
    <Modal
      description={`Order #${orderID} will be booked with ${names[provider]}.`}
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={provider === "pathao" && !location}
            loading={pending}
            onClick={() =>
              run(
                async () => {
                  const result = await bookCourier(orderID, {
                    provider,
                    codAmount: cod,
                    note,
                    weight,
                    location,
                    markShipped,
                  });
                  if (result.ok) toast.success(`Consignment ${result.data}`);
                  return result;
                },
                { onSuccess: onClose },
              )
            }
          >
            <PackageCheck /> Book with {names[provider]}
          </Button>
        </>
      }
      onClose={onClose}
      open
      title={`Send to ${names[provider]}`}
    >
      <div className="grid gap-4">
        <div className="rounded-lg bg-surface-muted p-3 text-sm">
          <p className="text-xs font-semibold text-muted">Deliver to</p>
          <p className="mt-0.5 whitespace-pre-line">{address}</p>
        </div>

        {provider === "pathao" && (
          <div className="grid gap-2 rounded-lg border border-line p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-ink">
              <MapPin className="size-3.5" /> Pathao delivery area
            </p>
            {locating ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <LoaderCircle className="size-4 animate-spin" /> Finding the
                area…
              </p>
            ) : location ? (
              <p className="text-sm font-semibold text-good">
                {location.label}
              </p>
            ) : (
              <p className="text-sm text-bad">
                {locateError ?? "Area not found"}
              </p>
            )}
            <div className="flex gap-2">
              <Input
                aria-label="Address to look up"
                onChange={(event) => setSearchAddress(event.target.value)}
                value={searchAddress}
              />
              <Button
                disabled={locating}
                onClick={() => locate(searchAddress)}
                size="sm"
                variant="secondary"
              >
                Find
              </Button>
            </div>
            <p className="text-[11px] text-muted">
              If the area is wrong, add the thana and district (e.g. “Mirpur 10,
              Dhaka”) and press Find.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            hint="0 if the customer already paid."
            htmlFor="cod"
            label="Cash to collect"
          >
            <PrefixInput
              id="cod"
              min={0}
              onChange={(event) => setCod(Number(event.target.value))}
              prefix="৳"
              type="number"
              value={cod}
            />
          </Field>
          {provider === "pathao" && (
            <Field htmlFor="weight" label="Weight (kg)">
              <Input
                id="weight"
                min={0.1}
                onChange={(event) => setWeight(Number(event.target.value))}
                step={0.1}
                type="number"
                value={weight}
              />
            </Field>
          )}
        </div>
        <Field htmlFor="courier-note" label="Note for the rider" optional>
          <Textarea
            className="min-h-16"
            id="courier-note"
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </Field>
        <Checkbox
          checked={markShipped}
          label="Mark the order as shipped"
          onChange={(event) => setMarkShipped(event.target.checked)}
        />
      </div>
    </Modal>
  );
}
