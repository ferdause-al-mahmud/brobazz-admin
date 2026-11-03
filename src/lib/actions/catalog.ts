"use server";

import { isValidObjectId, Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Attribute } from "@/lib/models/Attribute";
import { Category } from "@/lib/models/Category";
import { Collection } from "@/lib/models/Collection";
import { Product } from "@/lib/models/Product";
import { revalidateStorefront } from "@/lib/revalidate";
import { slugify } from "@/lib/slug";
import { PRODUCT_TYPES, type ProductType } from "@/lib/store-definitions";
import { InputError, runAction } from "./result";

// ---------- Categories ----------

export type CategoryInput = {
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  image: string | null;
  productType: ProductType | null;
  isActive: boolean;
  showInNav: boolean;
  showOnHome: boolean;
};

/**
 * Creates or updates a category. Products store category names, so a rename is applied to
 * every product (and collection rule) that uses the old one.
 */
export async function saveCategory(input: CategoryInput, id: string | null) {
  return runAction(async () => {
    const user = await requireStaff();
    const name = input.name.trim();
    const slug = slugify(input.slug.trim() || name);
    if (name.length < 2) throw new InputError("Enter a name", { name: "Enter a name" });
    if (input.productType && !PRODUCT_TYPES.includes(input.productType)) throw new InputError("Unknown product type");
    if (input.parentId && !isValidObjectId(input.parentId)) throw new InputError("Choose a valid parent");

    await connectToDatabase();
    const clash = await Category.findOne({ slug, ...(id ? { _id: { $ne: id } } : {}) }).lean();
    if (clash) throw new InputError(`"${clash.name}" already uses that URL`, { slug: "Already in use" });

    const parent = input.parentId ? await Category.findById(input.parentId).lean() : null;
    if (input.parentId && (!parent || parent.parent)) {
      throw new InputError("Sub-categories can only sit under a top-level category");
    }

    const fields = {
      name,
      slug,
      parent: parent?._id ?? null,
      description: input.description.trim(),
      image: input.image || undefined,
      productType: input.productType,
      isActive: input.isActive,
      showInNav: input.showInNav,
      showOnHome: input.showOnHome,
    };

    if (!id) {
      const last = await Category.findOne({ parent: fields.parent }).sort({ sortOrder: -1 }).lean();
      await Category.create({ ...fields, sortOrder: (last?.sortOrder ?? -1) + 1 });
    } else {
      const category = await Category.findById(id);
      if (!category) throw new InputError("This category no longer exists");
      const wasChild = Boolean(category.parent);
      const { name: oldName, slug: oldSlug } = category;
      const field = wasChild ? "subCategory" : "category";
      const inUse = await Product.countDocuments({ [`${field}Slug`]: oldSlug });

      if (String(category.parent ?? "") !== String(fields.parent ?? "")) {
        if (inUse) throw new InputError("Move this category's products first; its level can't change while products use it");
        if (!wasChild && (await Category.exists({ parent: category._id }))) {
          throw new InputError("A category with sub-categories can't become a sub-category");
        }
      }

      category.set(fields);
      await category.save();

      if (inUse && (oldName !== name || oldSlug !== slug)) {
        await Product.updateMany({ [`${field}Slug`]: oldSlug }, { $set: { [field]: name, [`${field}Slug`]: slug } });
      }
      if (oldSlug !== slug) {
        await Collection.updateMany({ "rules.categories": oldSlug }, { $set: { "rules.categories.$": slug } });
      }
    }

    revalidatePath("/products/categories");
    await revalidateStorefront(["categories", "products", "collections"], user.id);
  }, id ? "Category saved" : "Category created");
}

export async function deleteCategory(id: string) {
  return runAction(async () => {
    const user = await requireStaff({ adminOnly: true });
    await connectToDatabase();
    const category = await Category.findById(id).lean();
    if (!category) return;
    if (await Category.exists({ parent: category._id })) throw new InputError("Delete or move its sub-categories first");

    const field = category.parent ? "subCategorySlug" : "categorySlug";
    const used = await Product.countDocuments({ [field]: category.slug });
    if (used) throw new InputError(`${used} product${used === 1 ? " uses" : "s use"} this category. Move them first.`);

    await Category.deleteOne({ _id: id });
    await Collection.updateMany({}, { $pull: { "rules.categories": category.slug } });
    revalidatePath("/products/categories");
    await revalidateStorefront(["categories", "collections"], user.id);
  }, "Category deleted");
}

/** Swaps a category with its neighbour above (-1) or below (+1) among its siblings. */
export async function moveCategory(id: string, direction: -1 | 1) {
  return runAction(async () => {
    const user = await requireStaff();
    await connectToDatabase();
    const category = await Category.findById(id).lean();
    if (!category) return;

    const siblings = await Category.find({ parent: category.parent ?? null }).sort({ sortOrder: 1, name: 1 }).lean();
    const index = siblings.findIndex((item) => String(item._id) === id);
    const target = index + direction;
    if (target < 0 || target >= siblings.length) return;

    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    await Category.bulkWrite(
      siblings.map((item, order) => ({ updateOne: { filter: { _id: item._id }, update: { $set: { sortOrder: order } } } })),
    );
    revalidatePath("/products/categories");
    await revalidateStorefront(["categories"], user.id);
  });
}

// ---------- Variation presets ----------

export type AttributeInput = { name: string; values: string[]; productTypes: ProductType[] };

export async function saveAttribute(input: AttributeInput, id: string | null) {
  return runAction(async () => {
    await requireStaff();
    const name = input.name.trim();
    const values = [...new Set(input.values.map((value) => value.trim()).filter(Boolean))];
    if (!name) throw new InputError("Enter a name", { name: "Enter a name" });
    if (!values.length) throw new InputError("Add at least one value", { values: "Add at least one value" });

    await connectToDatabase();
    const fields = { name, values, productTypes: input.productTypes.filter((type) => PRODUCT_TYPES.includes(type)) };
    if (id) await Attribute.updateOne({ _id: new Types.ObjectId(id) }, { $set: fields });
    else {
      const count = await Attribute.countDocuments();
      await Attribute.create({ ...fields, sortOrder: count });
    }
    revalidatePath("/products/variations");
  }, id ? "Variation saved" : "Variation created");
}

export async function deleteAttribute(id: string) {
  return runAction(async () => {
    await requireStaff();
    await connectToDatabase();
    await Attribute.deleteOne({ _id: id });
    revalidatePath("/products/variations");
  }, "Variation deleted");
}

/** Adds the common presets for both product types (only the ones that don't exist yet). */
export async function addStarterAttributes() {
  return runAction(async () => {
    await requireStaff();
    await connectToDatabase();
    const starters: AttributeInput[] = [
      { name: "Size", values: ["XS", "S", "M", "L", "XL", "XXL"], productTypes: ["clothing"] },
      { name: "Color", values: ["Black", "Brown", "Tan", "Navy", "White"], productTypes: [] },
      { name: "Belt size", values: ["30", "32", "34", "36", "38", "40", "42"], productTypes: ["leather"] },
      { name: "Fit", values: ["Slim", "Regular", "Relaxed"], productTypes: ["clothing"] },
    ];
    let order = await Attribute.countDocuments();
    for (const starter of starters) {
      if (await Attribute.exists({ name: starter.name })) continue;
      await Attribute.create({ ...starter, sortOrder: order++ });
    }
    revalidatePath("/products/variations");
  }, "Starter variations added");
}
