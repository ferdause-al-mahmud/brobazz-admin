import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { CollectionRowActions } from "@/components/collections/CollectionRowActions";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, PageHeader } from "@/components/ui/Page";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { requireStaffPage } from "@/lib/auth/session";
import { collectionKindLabels, resolveCollection } from "@/lib/collection-rules";
import { getRuleProducts, toCollectionInput } from "@/lib/data/collections";
import { connectToDatabase } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { Collection } from "@/lib/models/Collection";
import { isWithinWindow } from "@/lib/store-definitions";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const user = await requireStaffPage();
  await connectToDatabase();
  const [collections, products] = await Promise.all([
    Collection.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
    getRuleProducts(),
  ]);
  const now = new Date();

  return (
    <>
      <PageHeader
        actions={
          <ButtonLink href="/collections/new">
            <Plus /> New collection
          </ButtonLink>
        }
        description="Group products by edit, season or campaign. Each has a page at /collections/…, and can appear as a homepage row (in this order)."
        title="Collections"
      />

      <Card>
        {collections.length === 0 ? (
          <EmptyState
            action={
              <ButtonLink href="/collections/new">
                <Plus /> New collection
              </ButtonLink>
            }
            description="Until you add one, the storefront shows built-in New Arrivals, Best Sellers and Flash Sale rows."
            icon={<Layers />}
            title="No collections yet"
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Collection</Th>
                <Th>Type</Th>
                <Th>Products</Th>
                <Th>Status</Th>
                <Th className="w-0" />
              </tr>
            </thead>
            <tbody>
              {collections.map((collection, index) => {
                const input = toCollectionInput(collection);
                const count = resolveCollection(input, products).length;
                const scheduled = collection.startsAt && collection.startsAt > now;
                const ended = collection.endsAt && collection.endsAt < now;
                const live = collection.isActive && isWithinWindow(collection, now);
                return (
                  <Tr key={String(collection._id)}>
                    <Td>
                      <Link className="flex items-center gap-3" href={`/collections/${collection._id}`}>
                        <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md border border-line bg-surface-muted">
                          {collection.image && <Image alt="" className="object-cover" fill sizes="64px" src={collection.image} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold hover:text-brand-primary">{collection.name}</span>
                          <span className="text-xs text-muted">/collections/{collection.slug}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      <span className="block">{collectionKindLabels[collection.kind]}</span>
                      <span className="text-xs text-muted">{collection.mode === "smart" ? "Automatic" : "Hand-picked"}</span>
                    </Td>
                    <Td className="tabular-nums">{count}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {live ? <Badge dot tone="good">Live</Badge> : scheduled ? <Badge dot tone="info">Starts {formatDate(collection.startsAt!)}</Badge> : ended ? <Badge dot>Ended</Badge> : <Badge dot>Off</Badge>}
                        {collection.showOnHome && <Badge tone="gold">Homepage</Badge>}
                      </div>
                      {live && collection.endsAt && <p className="mt-1 text-[11px] text-muted">Ends {formatDate(collection.endsAt)}</p>}
                    </Td>
                    <Td>
                      <CollectionRowActions
                        canDelete={user.role === "admin"}
                        id={String(collection._id)}
                        isActive={collection.isActive}
                        isFirst={index === 0}
                        isLast={index === collections.length - 1}
                        name={collection.name}
                        showOnHome={collection.showOnHome}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
