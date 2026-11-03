# Brobazz Admin

The staff panel for the **Brobazz** online store. Staff use it to manage products, stock, orders, collections, coupons, reviews, storefront content and courier bookings.

The admin and the customer storefront ([brobazz-customer](https://github.com/ferdause-al-mahmud/brobazz-customer)) share one MongoDB database. Every change made here shows up on the storefront, and every storefront order appears here.

**Stack:** Next.js 16 (App Router, server actions) · React 19 · TypeScript · MongoDB with Mongoose · Tailwind CSS v4 · Recharts · lucide-react · sonner

---

## Features

| Section | What it does |
|---|---|
| **Dashboard** | Sales and order stats, a revenue chart, and pending-order, pending-review and low-stock counts |
| **Orders** | Filter and search orders. Change status, payment and notes. Create manual orders (phone, Facebook, Instagram, WhatsApp, walk-in). Print invoices |
| **Courier booking** | Book parcels with **Pathao** or **Steadfast**, sync their status, and see each courier's fraud check / customer success rate |
| **Products** | Leather and clothing products with up to three options (Size, Color, …) and one variant per combination, each with its own SKU, price and stock |
| **Categories / Variations / Stock** | Category tree with sub-categories, reusable option values, and inline stock editing |
| **Collections** | Hand-picked or rule-based (category, type, tags, on sale, new, price range), with an optional date window for campaigns |
| **Customers** | Customer list and per-customer order history |
| **Reviews** | Approve, hide or delete product reviews |
| **Coupons** *(admin)* | Percentage or fixed discounts with limits and expiry dates |
| **Store content** *(admin)* | Homepage hero slides, announcements, and featured categories and collections |
| **Media library** | Upload images. They're converted to WebP and saved as files on the server (`UPLOAD_DIR`) |
| **Settings / Staff** *(admin)* | Store details, shipping options, and staff roles |

Sections marked *(admin)* are only open to the `admin` role. Moderators can use everything else.

---

## Getting started

### Prerequisites

- Node.js 20 or newer
- Access to the shared MongoDB Atlas database
- The [storefront](https://github.com/ferdause-al-mahmud/brobazz-customer) running locally, if you want admin edits to refresh it immediately

### Install and run

```bash
git clone https://github.com/ferdause-al-mahmud/brobazz-admin.git
cd brobazz-admin
npm install
# create .env (see below)
npm run dev        # http://localhost:3001
```

The admin runs on port **3001** so it can run alongside the storefront on 3000.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server on port 3001 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build on port 3001 |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check with `tsc --noEmit` |

---

## Environment variables

Create a `.env` file in the project root. `.env` and `.env.local` are gitignored, and `.env.local` overrides `.env`.

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ ¹ | Full MongoDB connection string |
| `DB_USER`, `DB_PASSWORD` | ✅ ¹ | Atlas credentials, used when `MONGODB_URI` isn't set |
| `DB_HOST` | | Atlas host (default `cluster0.vvjno4o.mongodb.net`) |
| `DB_NAME` | | Database name (default `brobazz`) |
| `JWT_ACCESS_SECRET` | ✅ | Signs staff sessions. **Must match the storefront's value.** The storefront also uses it to verify cache-refresh requests |
| `JWT_ACCESS_EXPIRES_IN` | | Session lifetime (default `72h`) |
| `UPLOAD_DIR` | | Absolute folder where uploaded images are saved, e.g. `/var/www/brobazz/uploads`. **Must be the same folder the storefront uses.** Default: `../uploads` (next to the two app folders) |
| `UPLOAD_ENDPOINT` | | *Testing only.* URL of a remote upload server (e.g. `https://admin.classytouchbd.com/api/upload`). When set, images are sent there instead of written to `UPLOAD_DIR`. It must accept multipart field `files` and reply `{ success, files: [{ url, fileName }] }` |
| `UPLOAD_PUBLIC_URL` | | *Testing only.* Where that server serves the files, e.g. `https://classytouchbd.com/uploads`. Allowed for `next/image`, and returned URLs must start with it. Set it in the storefront too |
| `STOREFRONT_URL` | | Storefront base URL, e.g. `http://localhost:3000`. Used to refresh the storefront cache after edits and for "view on store" links. Without it, changes appear within about an hour |
| `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET` | | Google sign-in for staff (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` also work) |
| `GOOGLE_REDIRECT_URI` | | Google OAuth callback, e.g. `http://localhost:3001/api/auth/google/callback` |
| `STEADFAST_API_KEY`, `STEADFAST_SECRET_KEY` | | Steadfast (Packzy) parcel booking, status and fraud check |
| `PATHAO_TOKEN`, `PATHAO_STORE_ID` | | Pathao parcel booking, address lookup, status and success rate |

¹ Set either `MONGODB_URI` or `DB_USER` + `DB_PASSWORD`.

```env
DB_USER=
DB_PASSWORD=
JWT_ACCESS_SECRET=
STOREFRONT_URL=http://localhost:3000

# Optional
OAUTH_CLIENT_ID=
OAUTH_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
STEADFAST_API_KEY=
STEADFAST_SECRET_KEY=
PATHAO_TOKEN=
PATHAO_STORE_ID=
```

---

## Staff accounts

Staff are ordinary storefront accounts with the `admin` or `moderator` role. Customers have the role `customer` and can't sign in here.

1. Register an account on the storefront.
2. **First admin only:** set the role directly in the database:
   ```js
   db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
   ```
3. After that, admins manage other staff under **Settings → Staff**.

---

## How it works

- **Pages** are React Server Components that query Mongoose directly. Data loaders live in `src/lib/data/`.
- **Writes** go through server actions in `src/lib/actions/`. Each action checks the role with `requireStaff()` and returns an `ActionResult`.
- **Route guard:** `src/proxy.ts` redirects signed-out visitors to `/login` and moderators away from admin-only sections. Pages and actions still check the role themselves.
- **Storefront cache:** after a change, `src/lib/revalidate.ts` calls the storefront's `POST /api/revalidate` with a signed token, and the storefront drops the matching cache tags (`products`, `categories`, `collections`, `settings`, `reviews`).
- **Stock:** the storefront reserves stock per variant at checkout. Cancelling or returning an order here puts the items back once (`src/lib/order-stock.ts`). Each product's `stock` and `finalPrice` fields are kept in sync for listing queries.
- **Images:** the browser sends one file per server action call (`src/components/media/uploadFiles.ts`). `saveImage()` in `src/lib/media.ts` checks the file (image, max 10 MB), resizes it to fit within 2400 px, converts it to WebP with `sharp`, writes it to `UPLOAD_DIR/<uuid>.webp`, and records it in the `media_uploads` collection. Both apps serve it at `/uploads/<uuid>.webp`, and that URL is what gets saved on products. Images uploaded before the switch to disk are still in MongoDB GridFS and served at `/media/<id>`.

### Shared schema

`src/lib/models/*`, `src/lib/store-definitions.ts` and `src/lib/collection-rules.ts` mirror files in the storefront repo (`lib/`). The two apps are separate repos, so **when you change one copy, change the other too.** Each of these files has a note saying so.

---

## Project structure

```
src/
├── app/
│   ├── (admin)/            # Signed-in area with sidebar
│   │   ├── dashboard/
│   │   ├── orders/         # list, [orderID], new (manual order)
│   │   ├── products/       # list, [id], new, categories, variations, stock
│   │   ├── collections/    # list, [id], new
│   │   ├── customers/
│   │   ├── reviews/
│   │   ├── coupons/
│   │   ├── content/
│   │   ├── media-library/
│   │   └── settings/       # + staff/
│   ├── (print)/            # Printable invoice (no sidebar)
│   ├── api/auth/google/    # Google OAuth start + callback
│   ├── login/
│   ├── uploads/[file]/     # Serves uploaded images from UPLOAD_DIR
│   └── media/[file]/       # Serves legacy GridFS images
├── components/
│   ├── ui/                 # Button, Card, Field, Table, Tabs, Badge, Page …
│   ├── layout/             # Sidebar
│   └── <section>/          # One folder per admin section
├── lib/
│   ├── actions/            # Server actions (writes)
│   ├── data/               # Server-side data loaders (reads)
│   ├── auth/               # JWT + session helpers
│   ├── models/             # Mongoose models (shared with the storefront)
│   ├── couriers.ts         # Pathao / Steadfast integration
│   └── db.ts, media.ts, format.ts, …
└── proxy.ts                # Route guard
```

---

## Deployment

Uploaded images are written to the server's disk, so the admin needs a server with a persistent filesystem (a VPS), **on the same machine as the storefront**. Serverless hosts such as Vercel have no lasting disk and will lose uploads.

1. Set the environment variables above, for example in a `.env` file on the server.
2. Create the upload folder, make it writable by the user that runs the admin, and set `UPLOAD_DIR` to it in **both** apps:
   ```bash
   sudo mkdir -p /var/www/brobazz/uploads
   sudo chown -R <app-user>: /var/www/brobazz/uploads
   ```
3. Set `STOREFRONT_URL` to the live storefront URL, and `GOOGLE_REDIRECT_URI` to `https://<admin-domain>/api/auth/google/callback`.
4. Use the **same** `JWT_ACCESS_SECRET` as the storefront.
5. Optional but faster: let nginx serve uploads directly instead of going through Node. Add this to the `server` block of both sites:
   ```nginx
   location /uploads/ {
       alias /var/www/brobazz/uploads/;
       expires 1y;
       add_header Cache-Control "public, immutable";
       try_files $uri =404;
   }
   ```
   Also set `client_max_body_size 12m;` so nginx doesn't reject large uploads before they reach the admin.
6. Check locally first with `npm run typecheck && npm run build`. Back up the upload folder along with the database.
