import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Boxes } from "lucide-react";
import { StockCell } from "@/components/products/StockCell";
import { StockBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ParamSelect, SearchBox } from "@/components/ui/client";
import { EmptyState, PageHeader, Pagination, withParams } from "@/components/ui/Page";
import { LinkTabs } from "@/components/ui/Tabs";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { requireStaffPage } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { formatTaka } from "@/lib/format";
import { Product, type ProductDocument } from "@/lib/models/Product";
import { PRODUCT_TYPES, productTypeLabels, variantLabel } from "@/lib/store-definitions";

export const metadata: Metadata = { title: "Stock" };

const PAGE_SIZE = 40;

type StockLine = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  variant: string;
  sku: string;
  image: string | null;
  stock: number;
  threshold: number;
  cost: number | null;
  isActive: boolean;
};

export default async function StockPage({ searchParams }: PageProps<"/products/stock">) {
  await requireStaffPage();
  const params = Object.fromEntries(
    Object.entries(await searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Record<string, string | undefined>;
  const view = params.view === "low" || params.view === "out" ? params.view : "all";
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim().toLowerCase();

  await connectToDatabase();
  const productType = PRODUCT_TYPES.find((type) => type === params.type);
  const products = await Product.find(productType ? { productType } : {})
    .sort({ name: 1 })
    .lean<(ProductDocument & { _id: string })[]>();

  // One line per variant, or per product when it has none.
  const lines = products.flatMap((product): StockLine[] => {
    const threshold = product.lowStockThreshold ?? 5;
    if (!product.variants.length) {
      return [
        {
          key: product._id,
          productId: product._id,
          variantId: null,
          name: product.name,
          variant: "",
          sku: product._id,
          image: product.images[0] ?? null,
          stock: product.stock,
          threshold,
          cost: product.costPrice ?? null,
          isActive: product.isActive ?? true,
        },
      ];
    }
    return product.variants.map((variant): StockLine => {
      const id = String((variant as { _id?: unknown })._id);
      return {
        key: `${product._id}:${id}`,
        productId: product._id,
        variantId: id,
        name: product.name,
        variant: variantLabel(variant.options),
        sku: variant.sku ?? "",
        image: variant.image ?? product.images[0] ?? null,
        stock: variant.stock,
        threshold,
        cost: product.costPrice ?? null,
        isActive: (product.isActive ?? true) && (variant.isActive ?? true),
      };
    });
  });

  const searched = q
    ? lines.filter((line) => `${line.name} ${line.variant} ${line.sku} ${line.productId}`.toLowerCase().includes(q))
    : lines;
  const low = searched.filter((line) => line.stock > 0 && line.stock <= line.threshold);
  const out = searched.filter((line) => line.stock < 1);
  const shown = view === "low" ? low : view === "out" ? out : searched;
  const pageLines = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const units = lines.reduce((sum, line) => sum + line.stock, 0);
  const value = lines.reduce((sum, line) => sum + (line.cost ?? 0) * line.stock, 0);
  const href = (overrides: Record<string, string | number | undefined>) => withParams("/products/stock", params, overrides);

  return (
    <>
      <PageHeader description="Stock is tracked per variant. Orders take stock automatically; cancelling or returning an order can put it back." title="Stock" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Units in stock", value: units.toLocaleString() },
          { label: "Stock value at cost", value: value ? formatTaka(value) : "Add cost prices" },
          { label: "Need restocking", value: `${(lines.filter((line) => line.stock <= line.threshold).length).toLocaleString()} lines` },
        ].map((stat) => (
          <Card className="px-5 py-4" key={stat.label}>
            <p className="text-xs font-semibold text-muted">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-brand-ink">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="border-b border-line px-5 pt-1">
          <LinkTabs
            active={view}
            tabs={[
              { value: "all", label: "All", count: searched.length, href: href({ view: undefined, page: undefined }) },
              { value: "low", label: "Low stock", count: low.length, href: href({ view: "low", page: undefined }) },
              { value: "out", label: "Out of stock", count: out.length, href: href({ view: "out", page: undefined }) },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2 px-5 py-3">
          <SearchBox placeholder="Search product, variant or SKU" />
          <ParamSelect
            label="Product type"
            options={[{ value: "", label: "All types" }, ...PRODUCT_TYPES.map((type) => ({ value: type, label: productTypeLabels[type] }))]}
            param="type"
          />
        </div>

        {pageLines.length === 0 ? (
          <EmptyState description={view === "all" ? "Add products to track their stock." : "Nothing here right now."} icon={<Boxes />} title="No stock lines" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Status</Th>
                <Th className="text-right">Units</Th>
              </tr>
            </thead>
            <tbody>
              {pageLines.map((line) => (
                <Tr key={line.key}>
                  <Td>
                    <Link className="flex items-center gap-3" href={`/products/${encodeURIComponent(line.productId)}`}>
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted">
                        {line.image && <Image alt="" className="object-cover" fill sizes="40px" src={line.image} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold hover:text-brand-primary">{line.name}</span>
                        <span className="text-xs text-muted">
                          {line.variant || "Single item"}
                          {!line.isActive && " · not on sale"}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="font-mono text-xs text-muted">{line.sku || "—"}</Td>
                  <Td>
                    <StockBadge stock={line.stock} threshold={line.threshold} />
                  </Td>
                  <Td>
                    <StockCell label={line.variant ? `${line.name} ${line.variant}` : line.name} productId={line.productId} stock={line.stock} variantId={line.variantId} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination hrefFor={(next) => href({ page: next })} page={page} pageSize={PAGE_SIZE} total={shown.length} totalPages={Math.ceil(shown.length / PAGE_SIZE)} />
      </Card>
    </>
  );
}
