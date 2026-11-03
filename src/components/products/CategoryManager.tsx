"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, CornerDownRight, FolderTree, Home, Menu, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { SingleImagePicker } from "@/components/media/ImagePicker";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/Field";
import { ConfirmButton, Modal, useAction } from "@/components/ui/client";
import { EmptyState } from "@/components/ui/Page";
import { deleteCategory, moveCategory, saveCategory, type CategoryInput } from "@/lib/actions/catalog";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/slug";
import { PRODUCT_TYPES, productTypeLabels, type ProductType } from "@/lib/store-definitions";

export type CategoryRow = CategoryInput & { id: string; productCount: number };
type TreeRow = CategoryRow & { children: CategoryRow[] };

const blank = (parentId: string | null = null): CategoryInput => ({
  name: "",
  slug: "",
  parentId,
  description: "",
  image: null,
  productType: null,
  isActive: true,
  showInNav: true,
  showOnHome: false,
});

export function CategoryManager({
  rows,
  unmanaged,
  canDelete,
}: {
  rows: TreeRow[];
  unmanaged: { slug: string; count: number }[];
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState<{ id: string | null; input: CategoryInput } | null>(null);

  return (
    <>
      {unmanaged.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            Some products use categories that aren&apos;t set up here:{" "}
            {unmanaged.map(({ slug, count }) => `${slug} (${count})`).join(", ")}. Create a category with the same URL to
            manage them.
          </p>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="text-sm font-semibold text-brand-ink">
            {rows.length} categor{rows.length === 1 ? "y" : "ies"}
          </p>
          <Button onClick={() => setEditing({ id: null, input: blank() })} size="sm">
            <Plus /> Add category
          </Button>
        </div>

        {rows.length === 0 ? (
          <EmptyState description="Create categories like Wallets, Belts or T-shirts." icon={<FolderTree />} title="No categories yet" />
        ) : (
          <ul>
            {rows.map((row, index) => (
              <li className="border-b border-line last:border-b-0" key={row.id}>
                <CategoryLine
                  canDelete={canDelete}
                  isFirst={index === 0}
                  isLast={index === rows.length - 1}
                  onAddChild={() => setEditing({ id: null, input: blank(row.id) })}
                  onEdit={() => setEditing({ id: row.id, input: row })}
                  row={row}
                />
                {row.children.length > 0 && (
                  <ul className="border-t border-line bg-surface-muted/50">
                    {row.children.map((child, childIndex) => (
                      <li className="border-b border-line/70 last:border-b-0" key={child.id}>
                        <CategoryLine
                          canDelete={canDelete}
                          child
                          isFirst={childIndex === 0}
                          isLast={childIndex === row.children.length - 1}
                          onEdit={() => setEditing({ id: child.id, input: child })}
                          row={child}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && (
        <CategoryDialog
          editing={editing}
          onClose={() => setEditing(null)}
          parents={rows.filter((row) => row.id !== editing.id).map((row) => ({ id: row.id, name: row.name }))}
        />
      )}
    </>
  );
}

function CategoryLine({
  row,
  child,
  isFirst,
  isLast,
  canDelete,
  onEdit,
  onAddChild,
}: {
  row: CategoryRow;
  child?: boolean;
  isFirst: boolean;
  isLast: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onAddChild?: () => void;
}) {
  const { pending, run } = useAction();

  return (
    <div className={cn("flex flex-wrap items-center gap-3 px-5 py-3", child && "pl-8")}>
      {child && <CornerDownRight aria-hidden="true" className="size-4 text-subtle" />}
      <span className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted">
        {row.image && <Image alt="" className="object-cover" fill sizes="40px" src={row.image} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <button className="font-semibold text-brand-ink hover:text-brand-primary" onClick={onEdit} type="button">
            {row.name}
          </button>
          {!row.isActive && <Badge>Hidden</Badge>}
          {row.productType && <Badge tone="brand">{productTypeLabels[row.productType]}</Badge>}
          {row.showOnHome && (
            <Badge tone="gold">
              <Home className="size-3" /> Homepage
            </Badge>
          )}
          {!row.showInNav && (
            <Badge>
              <Menu className="size-3" /> Not in menu
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted">
          /collections/{row.slug} ·{" "}
          <Link className="hover:text-brand-primary hover:underline" href={`/products?${child ? "q" : "category"}=${child ? encodeURIComponent(row.name) : row.slug}`}>
            {row.productCount} product{row.productCount === 1 ? "" : "s"}
          </Link>
        </p>
      </div>
      <div className="flex items-center gap-0.5">
        <Button aria-label="Move up" disabled={isFirst || pending} onClick={() => run(() => moveCategory(row.id, -1))} size="icon" variant="ghost">
          <ArrowUp />
        </Button>
        <Button aria-label="Move down" disabled={isLast || pending} onClick={() => run(() => moveCategory(row.id, 1))} size="icon" variant="ghost">
          <ArrowDown />
        </Button>
        {onAddChild && (
          <Button onClick={onAddChild} size="xs" variant="ghost">
            <Plus /> Sub-category
          </Button>
        )}
        <Button aria-label={`Edit ${row.name}`} onClick={onEdit} size="icon" variant="ghost">
          <Pencil />
        </Button>
        {canDelete && (
          <ConfirmButton
            action={() => deleteCategory(row.id)}
            aria-label={`Delete ${row.name}`}
            description={row.productCount ? `${row.productCount} products use it, so you'll need to move them first.` : "This can't be undone."}
            size="icon"
            title={`Delete ${row.name}?`}
          >
            <Trash2 />
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}

function CategoryDialog({
  editing,
  parents,
  onClose,
}: {
  editing: { id: string | null; input: CategoryInput };
  parents: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [input, setInput] = useState(editing.input);
  const [slugTouched, setSlugTouched] = useState(Boolean(editing.id));
  const { pending, run } = useAction();
  const isChild = Boolean(input.parentId);

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button loading={pending} onClick={() => run(() => saveCategory(input, editing.id), { onSuccess: onClose })}>
            Save
          </Button>
        </>
      }
      onClose={onClose}
      open
      size="lg"
      title={editing.id ? `Edit ${editing.input.name}` : isChild ? "New sub-category" : "New category"}
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="grid content-start gap-4">
          <Field htmlFor="cat-name" label="Name">
            <Input
              autoFocus
              id="cat-name"
              onChange={(event) =>
                setInput({ ...input, name: event.target.value, ...(slugTouched ? {} : { slug: slugify(event.target.value) }) })
              }
              value={input.name}
            />
          </Field>
          <Field hint={`/collections/${input.slug || "…"}. Changing it breaks old links.`} htmlFor="cat-slug" label="URL">
            <Input
              id="cat-slug"
              onChange={(event) => {
                setSlugTouched(true);
                setInput({ ...input, slug: slugify(event.target.value) });
              }}
              value={input.slug}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="cat-parent" label="Parent">
              <Select id="cat-parent" onChange={(event) => setInput({ ...input, parentId: event.target.value || null })} value={input.parentId ?? ""}>
                <option value="">None (top level)</option>
                {parents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </Select>
            </Field>
            {!isChild && (
              <Field hint="Pre-selects the type for new products." htmlFor="cat-type" label="Product type">
                <Select
                  id="cat-type"
                  onChange={(event) => setInput({ ...input, productType: (event.target.value || null) as ProductType | null })}
                  value={input.productType ?? ""}
                >
                  <option value="">Any</option>
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {productTypeLabels[type]}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          {!isChild && (
            <Field hint="Shown at the top of the category page." htmlFor="cat-description" label="Description" optional>
              <Textarea id="cat-description" onChange={(event) => setInput({ ...input, description: event.target.value })} value={input.description} />
            </Field>
          )}
          <div className="grid gap-3 rounded-xl border border-line p-4">
            <Switch checked={input.isActive} label="Active" onChange={(event) => setInput({ ...input, isActive: event.target.checked })} />
            {!isChild && (
              <>
                <Switch checked={input.showInNav} description="In the storefront's category bar and mobile menu." label="Show in menu" onChange={(event) => setInput({ ...input, showInNav: event.target.checked })} />
                <Switch checked={input.showOnHome} description="As a tile in the homepage category carousel (needs an image)." label="Show on homepage" onChange={(event) => setInput({ ...input, showOnHome: event.target.checked })} />
              </>
            )}
          </div>
        </div>
        {!isChild && (
          <Field label="Image">
            <SingleImagePicker onChange={(image) => setInput({ ...input, image })} value={input.image} />
          </Field>
        )}
      </div>
    </Modal>
  );
}
