import "server-only";

// Pathao and Steadfast (Packzy) integrations: booking parcels, checking their status, and
// looking up a phone number's delivery record. Same endpoints and credentials the previous admin
// used. Every call returns { ok, ... } instead of throwing, so a courier outage never breaks a page.
//
// .env: PATHAO_TOKEN, PATHAO_STORE_ID, STEADFAST_API_KEY, STEADFAST_SECRET_KEY

const PATHAO_MERCHANT = "https://merchant.pathao.com/api/v1";
const PATHAO_HERMES = "https://api-hermes.pathao.com/aladdin/api/v1";
const STEADFAST = "https://portal.packzy.com/api/v1";
const TIMEOUT = 15_000;

export type CourierProvider = "pathao" | "steadfast";
export const courierNames: Record<CourierProvider, string> = { pathao: "Pathao", steadfast: "Steadfast" };

type Failure = { ok: false; error: string };

/** "০১৭১১-২২৩৩৪৪" or "+8801711223344" → "01711223344" */
export function normalizePhone(phone: string) {
  const digits = phone.replace(/[০-৯]/g, (char) => String("০১২৩৪৫৬৭৮৯".indexOf(char))).replace(/\D/g, "");
  return digits.startsWith("880") ? digits.slice(2) : digits;
}

function pathaoHeaders() {
  const token = process.env.PATHAO_TOKEN;
  return token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : null;
}

function steadfastHeaders() {
  const apiKey = process.env.STEADFAST_API_KEY;
  const secretKey = process.env.STEADFAST_SECRET_KEY;
  return apiKey && secretKey ? { "Content-Type": "application/json", "Api-Key": apiKey, "Secret-Key": secretKey } : null;
}

export function courierConfigured(provider: CourierProvider) {
  return provider === "pathao" ? Boolean(pathaoHeaders() && process.env.PATHAO_STORE_ID) : Boolean(steadfastHeaders());
}

async function request(url: string, init: RequestInit): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });
  const text = await response.text();
  try {
    return { status: response.status, body: JSON.parse(text) };
  } catch {
    return { status: response.status, body: text.slice(0, 300) };
  }
}

/** Pulls a readable message out of a courier's error response. */
function errorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    const record = body as { message?: unknown; errors?: unknown; error?: unknown };
    if (record.errors && typeof record.errors === "object") {
      const first = Object.values(record.errors as Record<string, unknown>).flat()[0];
      if (typeof first === "string") return first;
    }
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
  }
  return typeof body === "string" && body ? body : fallback;
}

function failure(error: unknown, label: string): Failure {
  const timedOut = error instanceof Error && error.name === "TimeoutError";
  console.error(`${label} failed`, error);
  return { ok: false, error: timedOut ? `${label} didn't respond in time. Try again.` : `Couldn't reach ${label}.` };
}

// ---------- Booking ----------

export type ParcelInput = {
  orderID: number;
  name: string;
  phone: string;
  address: string;
  note: string;
  /** Cash the courier collects (0 if already paid). */
  codAmount: number;
  itemDescription: string;
  itemQuantity: number;
  /** kg, Pathao only. */
  weight: number;
};

export type PathaoLocation = {
  cityId: number;
  zoneId: number;
  areaId: number | null;
  label: string;
};

/** Pathao needs city/zone/area IDs; its parser reads them from a free-text address. */
export async function parsePathaoAddress(address: string): Promise<({ ok: true } & PathaoLocation) | Failure> {
  const headers = pathaoHeaders();
  if (!headers) return { ok: false, error: "Add PATHAO_TOKEN to the admin's .env to use Pathao." };
  try {
    const { status, body } = await request(`${PATHAO_MERCHANT}/address-parser`, {
      method: "POST",
      headers,
      body: JSON.stringify({ address }),
    });
    const data = (body as { data?: Record<string, unknown> })?.data;
    const cityId = Number(data?.district_id ?? data?.city_id);
    const zoneId = Number(data?.zone_id);
    if (status >= 400 || !cityId || !zoneId) {
      return { ok: false, error: errorMessage(body, "Pathao couldn't recognise this address. Add the area and district.") };
    }
    const areaId = Number(data?.area_id) || null;
    const label = [data?.area_name, data?.zone_name, data?.district_name ?? data?.city_name].filter(Boolean).join(", ");
    return { ok: true, cityId, zoneId, areaId, label: label || `City ${cityId} · Zone ${zoneId}${areaId ? ` · Area ${areaId}` : ""}` };
  } catch (error) {
    return failure(error, "Pathao");
  }
}

export type Booking = { ok: true; consignmentId: string; trackingUrl: string; deliveryFee: number | null; status: string };

export async function bookPathao(parcel: ParcelInput, location: PathaoLocation): Promise<Booking | Failure> {
  const headers = pathaoHeaders();
  const storeId = Number(process.env.PATHAO_STORE_ID);
  if (!headers || !storeId) return { ok: false, error: "Add PATHAO_TOKEN and PATHAO_STORE_ID to the admin's .env to use Pathao." };

  const phone = normalizePhone(parcel.phone);
  try {
    const { status, body } = await request(`${PATHAO_MERCHANT}/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        store_id: storeId,
        merchant_order_id: String(parcel.orderID),
        recipient_name: parcel.name,
        recipient_phone: phone,
        recipient_address: parcel.address,
        recipient_city: location.cityId,
        recipient_zone: location.zoneId,
        ...(location.areaId ? { recipient_area: location.areaId } : {}),
        delivery_type: 48, // normal delivery
        item_type: 2, // parcel
        special_instruction: parcel.note || undefined,
        item_quantity: parcel.itemQuantity,
        item_weight: parcel.weight,
        item_description: parcel.itemDescription,
        amount_to_collect: Math.round(parcel.codAmount),
      }),
    });
    const data = (body as { data?: { consignment_id?: string; delivery_fee?: number; order_status?: string } })?.data;
    if (status >= 400 || !data?.consignment_id) return { ok: false, error: errorMessage(body, "Pathao rejected the booking") };
    return {
      ok: true,
      consignmentId: String(data.consignment_id),
      trackingUrl: `https://merchant.pathao.com/tracking?consignment_id=${data.consignment_id}&phone=${phone}`,
      deliveryFee: typeof data.delivery_fee === "number" ? data.delivery_fee : null,
      status: data.order_status ?? "Pending",
    };
  } catch (error) {
    return failure(error, "Pathao");
  }
}

export async function bookSteadfast(parcel: ParcelInput): Promise<Booking | Failure> {
  const headers = steadfastHeaders();
  if (!headers) return { ok: false, error: "Add STEADFAST_API_KEY and STEADFAST_SECRET_KEY to the admin's .env to use Steadfast." };
  try {
    const { status, body } = await request(`${STEADFAST}/create_order`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        invoice: String(parcel.orderID),
        recipient_name: parcel.name,
        recipient_phone: normalizePhone(parcel.phone),
        recipient_address: parcel.address,
        cod_amount: Math.round(parcel.codAmount),
        note: parcel.note,
        item_description: parcel.itemDescription,
        delivery_type: 0, // home delivery
      }),
    });
    const consignment = (body as { consignment?: { consignment_id?: number | string; tracking_code?: string; status?: string } })?.consignment;
    if (status >= 400 || !consignment?.consignment_id) {
      return { ok: false, error: errorMessage(body, "Steadfast rejected the booking") };
    }
    return {
      ok: true,
      consignmentId: String(consignment.consignment_id),
      trackingUrl: consignment.tracking_code ? `https://steadfast.com.bd/t/${consignment.tracking_code}` : "",
      deliveryFee: null,
      status: consignment.status ?? "in_review",
    };
  } catch (error) {
    return failure(error, "Steadfast");
  }
}

// ---------- Status ----------

export async function fetchCourierStatus(provider: CourierProvider, consignmentId: string): Promise<{ ok: true; status: string } | Failure> {
  try {
    if (provider === "pathao") {
      const headers = pathaoHeaders();
      if (!headers) return { ok: false, error: "PATHAO_TOKEN isn't set" };
      const { status, body } = await request(`${PATHAO_HERMES}/orders/${encodeURIComponent(consignmentId)}`, { headers });
      if (status === 429) return { ok: false, error: "Pathao is rate-limiting requests. Try again in a minute." };
      const orderStatus = (body as { data?: { order_status?: string } })?.data?.order_status;
      return status < 400 && orderStatus ? { ok: true, status: orderStatus } : { ok: false, error: errorMessage(body, "Pathao didn't return a status") };
    }
    const headers = steadfastHeaders();
    if (!headers) return { ok: false, error: "Steadfast keys aren't set" };
    const { status, body } = await request(`${STEADFAST}/status_by_cid/${encodeURIComponent(consignmentId)}`, { headers });
    const deliveryStatus = (body as { delivery_status?: string })?.delivery_status;
    return status < 400 && deliveryStatus ? { ok: true, status: deliveryStatus } : { ok: false, error: errorMessage(body, "Steadfast didn't return a status") };
  } catch (error) {
    return failure(error, courierNames[provider]);
  }
}

/** Whether a courier's status wording means the parcel reached the customer / came back. */
export function courierOutcome(status: string): "delivered" | "returned" | null {
  const value = status.toLowerCase().replace(/[\s-]+/g, "_");
  if (/partial/.test(value)) return null;
  if (/^delivered|delivered_approval|payment_invoice|^paid/.test(value)) return "delivered";
  if (/return|cancel/.test(value)) return "returned";
  return null;
}

// ---------- Customer delivery record ----------

export type PathaoRecord =
  | { ok: true; kind: "count"; total: number; delivered: number; returned: number; successRate: number }
  | { ok: true; kind: "rating"; rating: string };

export async function pathaoSuccessRate(phone: string): Promise<PathaoRecord | Failure> {
  const headers = pathaoHeaders();
  if (!headers) return { ok: false, error: "Add PATHAO_TOKEN to check Pathao history." };
  try {
    const { status, body } = await request(`${PATHAO_MERCHANT}/user/success`, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: normalizePhone(phone) }),
    });
    if (status >= 400) return { ok: false, error: errorMessage(body, "Pathao didn't return a record") };
    const data = (body as {
      data?: { show_count?: boolean; customer_rating?: string; customer?: { successful_delivery?: number; total_delivery?: number } };
    })?.data;
    if (data?.show_count && data.customer) {
      const delivered = data.customer.successful_delivery ?? 0;
      const total = data.customer.total_delivery ?? 0;
      return { ok: true, kind: "count", total, delivered, returned: Math.max(0, total - delivered), successRate: total ? (delivered / total) * 100 : 0 };
    }
    return { ok: true, kind: "rating", rating: data?.customer_rating ?? "unknown" };
  } catch (error) {
    return failure(error, "Pathao");
  }
}

export type SteadfastRecord = {
  ok: true;
  deliveryRatio: number | null;
  cancellationRatio: number | null;
  volumeBand: string | null;
  totalReports: number | null;
  fraudCategories: [string, number][];
};

/** Steadfast's shared fraud-check score: this phone's history across all their merchants. */
export async function steadfastFraudScore(phone: string): Promise<SteadfastRecord | Failure> {
  const headers = steadfastHeaders();
  if (!headers) return { ok: false, error: "Add the Steadfast keys to check Steadfast history." };
  try {
    const { status, body } = await request(`${STEADFAST}/fraud_check/score/${encodeURIComponent(normalizePhone(phone))}`, { headers });
    if (status === 429) return { ok: false, error: "Steadfast's fraud check limit is reached. Try again later." };
    if (status >= 400) return { ok: false, error: errorMessage(body, "Steadfast didn't return a record") };
    const data = body as {
      delivery_ratio?: number | null;
      cancellation_ratio?: number | null;
      volume_band?: string | null;
      total_reports?: number | null;
      fraud_categories?: Record<string, number> | null;
    };
    return {
      ok: true,
      deliveryRatio: data.delivery_ratio ?? null,
      cancellationRatio: data.cancellation_ratio ?? null,
      volumeBand: data.volume_band ?? null,
      totalReports: data.total_reports ?? null,
      fraudCategories:
        data.fraud_categories && typeof data.fraud_categories === "object" && !Array.isArray(data.fraud_categories)
          ? Object.entries(data.fraud_categories)
          : [],
    };
  } catch (error) {
    return failure(error, "Steadfast");
  }
}
