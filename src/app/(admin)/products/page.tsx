import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Package, Plus } from "lucide-react";
import type { QueryFilter } from "mongoose";
import { ProductRowActions } from "@/components/products/ProductRowActions";
import { Badge, StockBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ParamSelect, SearchBox } from "@/components/ui/client";
import { EmptyState, PageHeader, Pagination, withParams } from "@/components/ui/Page";
import { LinkTabs } from "@/components/ui/Tabs";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { requireStaffPage } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { formatTaka } from "@/lib/format";
import { Category } from "@/lib/models/Category";
import { Product, type ProductDocument } from "@/lib/models/Product";
import { PRODUCT_TYPES, productTypeLabels } from "@/lib/store-definitions";

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 20;

const statusFilters = {
  all: {},
  active: { isActive: true },
  hidden: { isActive: false },
  low: { isActive: true, stock: { $gt: 0 }, $expr: { $lte: ["$stock", "$lowStockThreshold"] } },
  out: { stock: { $lte: 0 } },
} as const;
type StatusFilter = keyof typeof statusFilters;

const sorts = {
  new: { createdAt: -1 },
  name: { name: 1 },
  "price-asc": { finalPrice: 1 },
  "price-desc": { finalPrice: -1 },
  "stock-asc": { stock: 1 },
  "best-selling": { soldCount: -1 },
} as const;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const user = await requireStaffPage();
  const params = Object.fromEntries(
    Object.entries(await searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Record<string, string | undefined>;

  const status: StatusFilter = params.status && params.status in statusFilters ? (params.status as StatusFilter) : "all";
  const sort = params.sort && params.sort in sorts ? (params.sort as keyof typeof sorts) : "new";
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim();

  const base: QueryFilter<ProductDocument> = {};
  if (params.type && PRODUCT_TYPES.includes(params.type as never)) base.productType = params.type as never;
  if (params.category) base.categorySlug = params.category;
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    base.$or = [{ name: pattern }, { _id: pattern }, { "variants.sku": pattern }, { tags: pattern }];
  }
  const filter = { ...base, ...statusFilters[status] } as QueryFilter<ProductDocument>;

  await connectToDatabase();
  const [products, total, counts, categories] = await Promise.all([
    Product.find(filter)
      .sort({ ...sorts[sort], _id: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean<(ProductDocument & { _id: string })[]>(),
    Product.countDocuments(filter),
    Promise.all(
      (Object.keys(statusFilters) as StatusFilter[]).map(async (key) => [
        key,
        await Product.countDocuments({ ...base, ...statusFilters[key] } as QueryFilter<ProductDocument>),
      ]),
    ).then((entries) => Object.fromEntries(entries) as Record<StatusFilter, number>),
    Category.find({ parent: null }).sort({ sortOrder: 1, name: 1 }).lean(),
  ]);

  const href = (overrides: Record<string, string | number | undefined>) => withParams("/products", params, overrides);
  const tabs: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Visible" },
    { value: "hidden", label: "Hidden" },
    { value: "low", label: "Low stock" },
    { value: "out", label: "Out of stock" },
  ];

  return (
    <>
      <PageHeader
        actions={
          <ButtonLink href="/products/new">
            <Plus /> Add product
          </ButtonLink>
        }
        description="Leather goods and clothing sold on the storefront."
        title="All products"
      />

      <Card>
        <div className="border-b border-line px-5 pt-1">
          <LinkTabs
            active={status}
            tabs={tabs.map((tab) => ({
              ...tab,
              count: counts[tab.value],
              href: href({ status: tab.value === "all" ? undefined : tab.value, page: undefined }),
            }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <SearchBox placeholder="Search name, code, SKU or tag" />
          <ParamSelect
            label="Product type"
            options={[{ value: "", label: "All types" }, ...PRODUCT_TYPES.map((type) => ({ value: type, label: productTypeLabels[type] }))]}
            param="type"
          />
          <ParamSelect
            label="Category"
            options={[{ value: "", label: "All categories" }, ...categories.map((category) => ({ value: category.slug, label: category.name }))]}
            param="category"
          />
          <div className="ml-auto">
            <ParamSelect
              label="Sort"
              options={[
                { value: "", label: "Newest first" },
                { value: "name", label: "Name A–Z" },
                { value: "best-selling", label: "Best selling" },
                { value: "price-asc", label: "Price: low to high" },
                { value: "price-desc", label: "Price: high to low" },
                { value: "stock-asc", label: "Stock: lowest first" },
              ]}
              param="sort"
            />
          </div>
        </div>

        {products.length === 0 ? (
          <EmptyState
            action={
              !q && status === "all" ? (
                <ButtonLink href="/products/new">
                  <Plus /> Add your first product
                </ButtonLink>
              ) : undefined
            }
            description={q || status !== "all" ? "Try a different search or filter." : "Products you add appear on the storefront."}
            icon={<Package />}
            title={q || status !== "all" ? "No products match" : "No products yet"}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Type</Th>
                <Th>Category</Th>
                <Th className="text-right">Price</Th>
                <Th>Stock</Th>
                <Th className="text-right">Sold</Th>
                <Th className="w-0" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const onSale = (product.finalPrice ?? product.price) < product.price;
                return (
                  <Tr key={product._id}>
                    <Td>
                      <Link className="flex min-w-0 items-center gap-3" href={`/products/${encodeURIComponent(product._id)}`}>
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted">
                          {product.images[0] && <Image alt="" className="object-cover" fill sizes="44px" src={product.images[0]} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-xs truncate font-semibold hover:text-brand-primary">{product.name}</span>
                          <span className="flex items-center gap-1.5 text-xs text-muted">
                            {product._id}
                            {product.variants.length > 0 && <span>· {product.variants.length} variants</span>}
                            {!product.isActive && <Badge>Hidden</Badge>}
                            {product.isFeatured && <Badge tone="gold">Featured</Badge>}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="text-muted">{productTypeLabels[(product.productType ?? "leather") as "leather"]}</Td>
                    <Td>
                      <span className="block">{product.category}</span>
                      {product.subCategory && <span className="text-xs text-muted">{product.subCategory}</span>}
                    </Td>
                    <Td className="text-right tabular-nums">
                      <span className="font-semibold">{formatTaka(product.finalPrice ?? product.price)}</span>
                      {onSale && <span className="block text-xs text-subtle line-through">{formatTaka(product.price)}</span>}
                    </Td>
                    <Td>
                      <StockBadge stock={product.stock} threshold={product.lowStockThreshold ?? 5} />
                    </Td>
                    <Td className="text-right tabular-nums text-muted">{product.soldCount ?? 0}</Td>
                    <Td>
                      <ProductRowActions
                        canDelete={user.role === "admin"}
                        id={product._id}
                        isActive={product.isActive ?? true}
                        isFeatured={product.isFeatured ?? false}
                        name={product.name}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination hrefFor={(next) => href({ page: next })} page={page} pageSize={PAGE_SIZE} total={total} totalPages={Math.ceil(total / PAGE_SIZE)} />
      </Card>
    </>
  );
}
