"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import type { CollectionInput } from "@/lib/collection-rules";
import { connectToDatabase } from "@/lib/db";
import { Category } from "@/lib/models/Category";
import { Collection } from "@/lib/models/Collection";
import { revalidateStorefront } from "@/lib/revalidate";
import { slugify } from "@/lib/slug";
import { COLLECTION_KINDS, COLLECTION_SORTS, PRODUCT_TYPES } from "@/lib/store-definitions";
import { InputError, runAction } from "./result";

function toDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function saveCollection(input: CollectionInput, id: string | null) {
  return runAction(async () => {
    const user = await requireStaff();
    const errors: Record<string, string> = {};
    const name = input.name.trim();
    const slug = slugify(input.slug.trim() || name);
    if (name.length < 2) errors.name = "Enter a name";
    if (!slug) errors.slug = "Enter a URL";
    if (!COLLECTION_KINDS.includes(input.kind)) errors.kind = "Choose a type";
    if (!COLLECTION_SORTS.includes(input.sort)) errors.sort = "Choose an order";
    if (input.sort === "manual" && input.mode !== "manual") errors.sort = "Manual order only works for hand-picked products";

    const startsAt = toDate(input.startsAt);
    const endsAt = toDate(input.endsAt);
    if (startsAt && endsAt && endsAt <= startsAt) errors.endsAt = "End must be after the start";

    const rules = input.rules;
    if (rules.minPrice !== null && rules.maxPrice !== null && rules.maxPrice < rules.minPrice) {
      errors.maxPrice = "Max must be at least the min";
    }
    if (input.mode === "manual" && !input.productIds.length) errors.productIds = "Pick at least one product";
    if (Object.keys(errors).length) throw new InputError("Please fix the highlighted fields", errors);

    await connectToDatabase();
    // Collection and category pages share /collections/<slug>.
    if (await Category.exists({ slug })) {
      throw new InputError("A category already uses that URL", { slug: "A category already uses this URL" });
    }
    if (await Collection.exists({ slug, ...(id ? { _id: { $ne: id } } : {}) })) {
      throw new InputError("Another collection uses that URL", { slug: "Already in use" });
    }

    const fields = {
      name,
      slug,
      kind: input.kind,
      eyebrow: input.eyebrow.trim(),
      description: input.description.trim(),
      image: input.image || undefined,
      mode: input.mode,
      productIds: [...new Set(input.productIds)],
      rules: {
        categories: rules.categories,
        productTypes: rules.productTypes.filter((type) => PRODUCT_TYPES.includes(type)),
        tags: rules.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
        onSale: rules.onSale,
        featuredOnly: rules.featuredOnly,
        inStockOnly: rules.inStockOnly,
        newWithinDays: rules.newWithinDays && rules.newWithinDays > 0 ? Math.floor(rules.newWithinDays) : null,
        minPrice: rules.minPrice,
        maxPrice: rules.maxPrice,
      },
      sort: input.sort,
      startsAt,
      endsAt,
      isActive: input.isActive,
      showOnHome: input.showOnHome,
      homeLimit: Math.min(24, Math.max(1, Math.floor(input.homeLimit || 8))),
    };

    let savedId = id;
    if (id) {
      const result = await Collection.updateOne({ _id: id }, { $set: fields }, { runValidators: true });
      if (!result.matchedCount) throw new InputError("This collection no longer exists");
    } else {
      const last = await Collection.findOne().sort({ sortOrder: -1 }).lean();
      const created = await Collection.create({ ...fields, sortOrder: (last?.sortOrder ?? -1) + 1 });
      savedId = String(created._id);
    }

    revalidatePath("/collections", "layout");
    await revalidateStorefront(["collections"], user.id);
    return savedId!;
  }, id ? "Collection saved" : "Collection created");
}

export async function deleteCollection(id: string) {
  return runAction(async () => {
    const user = await requireStaff({ adminOnly: true });
    await connectToDatabase();
    await Collection.deleteOne({ _id: id });
    revalidatePath("/collections", "layout");
    await revalidateStorefront(["collections"], user.id);
  }, "Collection deleted");
}

export async function setCollectionFlag(id: string, flag: "isActive" | "showOnHome", value: boolean) {
  return runAction(async () => {
    const user = await requireStaff();
    await connectToDatabase();
    await Collection.updateOne({ _id: id }, { $set: { [flag]: value } });
    revalidatePath("/collections");
    await revalidateStorefront(["collections"], user.id);
  });
}

/** Moves a collection up (-1) or down (+1); this is also the order of homepage rows. */
export async function moveCollection(id: string, direction: -1 | 1) {
  return runAction(async () => {
    const user = await requireStaff();
    await connectToDatabase();
    const all = await Collection.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    const index = all.findIndex((item) => String(item._id) === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= all.length) return;
    [all[index], all[target]] = [all[target], all[index]];
    await Collection.bulkWrite(
      all.map((item, order) => ({ updateOne: { filter: { _id: item._id }, update: { $set: { sortOrder: order } } } })),
    );
    revalidatePath("/collections");
    await revalidateStorefront(["collections"], user.id);
  });
}
