import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ParamSelect, SearchBox } from "@/components/ui/client";
import { EmptyState, PageHeader, Pagination, withParams } from "@/components/ui/Page";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { requireStaffPage } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { formatDate, formatTaka } from "@/lib/format";
import { User } from "@/lib/models/User";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 25;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type CustomerRow = {
  _id: unknown;
  name: string;
  email: string;
  phone?: string;
  googleId?: string;
  createdAt: Date;
  orders: number;
  spent: number;
  lastOrderAt: Date | null;
};

const sorts = {
  new: { createdAt: -1 },
  spent: { spent: -1, createdAt: -1 },
  orders: { orders: -1, createdAt: -1 },
  recent: { lastOrderAt: -1, createdAt: -1 },
} as const;

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  await requireStaffPage();
  const params = Object.fromEntries(
    Object.entries(await searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Record<string, string | undefined>;
  const page = Math.max(1, Number(params.page) || 1);
  const sort = params.sort && params.sort in sorts ? (params.sort as keyof typeof sorts) : "new";
  const q = params.q?.trim();

  const match: Record<string, unknown> = { role: "customer" };
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    match.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  await connectToDatabase();
  const [rows, total] = await Promise.all([
    User.aggregate<CustomerRow>([
      { $match: match },
      {
        $lookup: {
          from: "orders",
          localField: "_id",
          foreignField: "user",
          as: "orderStats",
          pipeline: [
            { $match: { status: "delivered" } },
            { $group: { _id: null, orders: { $sum: 1 }, spent: { $sum: "$total" }, last: { $max: "$createdAt" } } },
          ],
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          googleId: 1,
          createdAt: 1,
          orders: { $ifNull: [{ $first: "$orderStats.orders" }, 0] },
          spent: { $ifNull: [{ $first: "$orderStats.spent" }, 0] },
          lastOrderAt: { $ifNull: [{ $first: "$orderStats.last" }, null] },
        },
      },
      { $sort: sorts[sort] },
      { $skip: (page - 1) * PAGE_SIZE },
      { $limit: PAGE_SIZE },
    ]),
    User.countDocuments(match),
  ]);
  const href = (overrides: Record<string, string | number | undefined>) => withParams("/customers", params, overrides);

  return (
    <>
      <PageHeader description="Customers with a storefront account. Orders and spend count delivered orders. Guest orders are listed under Orders." title="Customers" />
      <Card>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <SearchBox placeholder="Search name, email or phone" />
          <div className="ml-auto">
            <ParamSelect
              label="Sort"
              options={[
                { value: "", label: "Newest accounts" },
                { value: "spent", label: "Most spent" },
                { value: "orders", label: "Most orders" },
                { value: "recent", label: "Ordered recently" },
              ]}
              param="sort"
            />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState description={q ? "Try a different search." : "Customers who register on the storefront appear here."} icon={<Users />} title={q ? "No customers match" : "No customers yet"} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Phone</Th>
                <Th className="text-right">Orders</Th>
                <Th className="text-right">Spent</Th>
                <Th>Last order</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Tr key={String(row._id)}>
                  <Td>
                    <Link className="font-semibold hover:text-brand-primary" href={`/customers/${String(row._id)}`}>
                      {row.name}
                    </Link>
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      {row.email}
                      {row.googleId && <Badge>Google</Badge>}
                    </span>
                  </Td>
                  <Td className="text-muted">{row.phone ?? "—"}</Td>
                  <Td className="text-right tabular-nums">{row.orders}</Td>
                  <Td className="text-right font-semibold tabular-nums">{formatTaka(row.spent)}</Td>
                  <Td className="text-muted">{row.lastOrderAt ? formatDate(row.lastOrderAt) : "—"}</Td>
                  <Td className="text-muted">{formatDate(row.createdAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination hrefFor={(next) => href({ page: next })} page={page} pageSize={PAGE_SIZE} total={total} totalPages={Math.ceil(total / PAGE_SIZE)} />
      </Card>
    </>
  );
}
