"use server";

import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Collection } from "@/lib/models/Collection";
import { Order } from "@/lib/models/Order";
import { Product } from "@/lib/models/Product";
import { MAX_OPTIONS, variantKey, type ProductInput } from "@/lib/product-input";
import { revalidateStorefront } from "@/lib/revalidate";
import { slugify } from "@/lib/slug";
import { PRODUCT_TYPES } from "@/lib/store-definitions";
import { InputError, runAction } from "./result";

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,30}$/;

function cleanList(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function money(value: number | null, field: string, errors: Record<string, string>) {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0) errors[field] = "Enter a price of 0 or more";
  return Math.round(value);
}

/** Checks the form input and returns the fields to store. Throws InputError listing what's wrong. */
function validate(input: ProductInput) {
  const errors: Record<string, string> = {};
  const id = input.id.trim().toUpperCase();
  const name = input.name.trim();
  const slug = slugify(input.slug.trim() || name);

  if (!CODE_PATTERN.test(id)) errors.id = "Use 2–31 letters, numbers or dashes, e.g. BIF-001";
  if (name.length < 2) errors.name = "Enter the product name";
  if (!slug) errors.slug = "Enter a URL slug";
  if (!PRODUCT_TYPES.includes(input.productType)) errors.productType = "Choose a product type";
  if (!input.category.trim()) errors.category = "Choose a category";

  const price = money(input.price, "price", errors) ?? 0;
  const salePrice = money(input.salePrice, "salePrice", errors);
  if (salePrice !== null && salePrice >= price) errors.salePrice = "The sale price must be lower than the price";
  const costPrice = money(input.costPrice, "costPrice", errors);

  const options = input.options
    .map((option) => ({ name: option.name.trim(), values: cleanList(option.values) }))
    .filter((option) => option.name && option.values.length);
  if (options.length > MAX_OPTIONS) errors.options = `Use at most ${MAX_OPTIONS} options`;
  if (new Set(options.map((option) => option.name.toLowerCase())).size !== options.length) {
    errors.options = "Each option needs a different name";
  }

  const seen = new Set<string>();
  const variants = options.length
    ? input.variants.map((variant, index) => {
        const key = variantKey(variant.options);
        if (seen.has(key)) errors[`variants.${index}`] = "This combination is listed twice";
        seen.add(key);
        if (!Number.isInteger(variant.stock) || variant.stock < 0) {
          errors[`variants.${index}.stock`] = "Stock must be a whole number of 0 or more";
        }
        const variantPrice = money(variant.price, `variants.${index}.price`, errors);
        const variantSale = money(variant.salePrice, `variants.${index}.salePrice`, errors);
        if (variantPrice !== null && variantSale !== null && variantSale >= variantPrice) {
          errors[`variants.${index}.salePrice`] = "Sale price must be lower";
        }
        return {
          ...(variant.id && Types.ObjectId.isValid(variant.id) ? { _id: new Types.ObjectId(variant.id) } : {}),
          sku: variant.sku.trim().toUpperCase() || undefined,
          options: variant.options.map(({ name: optionName, value }) => ({ name: optionName, value })),
          price: variantPrice,
          salePrice: variantPrice === null ? null : variantSale,
          stock: Math.max(0, Math.floor(variant.stock)),
          image: variant.image || undefined,
          isActive: variant.isActive,
        };
      })
    : [];
  if (options.length && !variants.length) errors.variants = "Add at least one variant";

  const skus = variants.map((variant) => variant.sku).filter(Boolean);
  if (new Set(skus).size !== skus.length) errors.variants = "Each variant needs a different SKU";

  if (!options.length && (!Number.isInteger(input.stock) || input.stock < 0)) {
    errors.stock = "Stock must be a whole number of 0 or more";
  }

  if (Object.keys(errors).length) throw new InputError("Please fix the highlighted fields", errors);

  return {
    _id: id,
    slug,
    name,
    productType: input.productType,
    category: input.category.trim(),
    subCategory: input.subCategory.trim() || undefined,
    tags: cleanList(input.tags.map((tag) => tag.toLowerCase())),
    description: input.description.trim(),
    materials: input.materials.trim(),
    highlights: cleanList(input.highlights),
    specs: input.specs
      .map((spec) => ({ label: spec.label.trim(), value: spec.value.trim() }))
      .filter((spec) => spec.label && spec.value),
    sizeChart: input.sizeChart || undefined,
    price,
    salePrice,
    costPrice,
    options,
    variants,
    // With variants the model's hook recomputes stock from them.
    stock: options.length ? 0 : Math.floor(input.stock),
    lowStockThreshold: Math.max(0, Math.floor(input.lowStockThreshold || 0)),
    images: input.images,
    isActive: input.isActive,
    isFeatured: input.isFeatured,
    seo: { title: input.seo.title.trim(), description: input.seo.description.trim() },
  };
}

/** Creates a product, or updates `originalId` when given. Returns the product code. */
export async function saveProduct(input: ProductInput, originalId: string | null) {
  return runAction(async () => {
    const user = await requireStaff();
    const fields = validate(input);
    await connectToDatabase();

    if (originalId) {
      const product = await Product.findById(originalId);
      if (!product) throw new InputError("This product no longer exists");
      // The code is what carts and past orders point at, so it can't change after creation.
      const { _id: _code, ...rest } = fields;
      product.set(rest);
      await product.save();
    } else {
      if (await Product.exists({ _id: fields._id })) {
        throw new InputError("That product code is already used", { id: "That code is already used" });
      }
      await Product.create(fields);
    }

    revalidatePath("/products", "layout");
    await revalidateStorefront(["products"], user.id);
    return fields._id;
  }, originalId ? "Product saved" : "Product created");
}

export async function setProductActive(id: string, isActive: boolean) {
  return runAction(async () => {
    const user = await requireStaff();
    await connectToDatabase();
    await Product.updateOne({ _id: id }, { $set: { isActive } });
    await revalidateStorefront(["products"], user.id);
  }, isActive ? "Product is visible in the store" : "Product hidden from the store");
}

export async function setProductFeatured(id: string, isFeatured: boolean) {
  return runAction(async () => {
    const user = await requireStaff();
    await connectToDatabase();
    await Product.updateOne({ _id: id }, { $set: { isFeatured } });
    await revalidateStorefront(["products"], user.id);
  }, isFeatured ? "Marked as featured" : "No longer featured");
}

/** Deletes a product that has never been ordered; otherwise asks to hide it instead. */
export async function deleteProduct(id: string) {
  return runAction(async () => {
    const user = await requireStaff({ adminOnly: true });
    await connectToDatabase();
    if (await Order.exists({ "items.productId": id })) {
      throw new InputError("This product appears in orders, so it can't be deleted. Hide it instead.");
    }
    await Product.deleteOne({ _id: id });
    await Collection.updateMany({ productIds: id }, { $pull: { productIds: id } });
    revalidatePath("/products", "layout");
    await revalidateStorefront(["products", "collections"], user.id);
  }, "Product deleted");
}

/** Copies a product under a new code as a hidden draft, with stock reset to 0. */
export async function duplicateProduct(id: string) {
  return runAction(async () => {
    await requireStaff();
    await connectToDatabase();
    const source = await Product.findById(id).lean();
    if (!source) throw new InputError("This product no longer exists");

    let copyId = `${source._id}-COPY`;
    for (let n = 2; await Product.exists({ _id: copyId }); n++) copyId = `${source._id}-COPY${n}`;

    const { _id, createdAt: _c, updatedAt: _u, ...rest } = source as typeof source & { createdAt?: Date; updatedAt?: Date };
    await Product.create({
      ...rest,
      _id: copyId,
      slug: `${source.slug}-copy-${Date.now().toString(36)}`,
      name: `${source.name} (copy)`,
      isActive: false,
      soldCount: 0,
      stock: 0,
      variants: source.variants.map(({ _id: _variantId, ...variant }) => ({
        ...variant,
        sku: variant.sku ? `${variant.sku}-COPY` : undefined,
        stock: 0,
      })),
    });
    revalidatePath("/products", "layout");
    return copyId;
  }, "Copy created as a hidden draft");
}

/**
 * Sets the stock of a simple product (variantId null) or one variant to an exact number, keeping the
 * product's total in step. Returns the new total.
 */
export async function setStock(productId: string, variantId: string | null, stock: number) {
  return runAction(async () => {
    const user = await requireStaff();
    if (!Number.isInteger(stock) || stock < 0) throw new InputError("Stock must be a whole number of 0 or more");
    await connectToDatabase();

    const product = await Product.findById(productId);
    if (!product) throw new InputError("This product no longer exists");
    if (variantId) {
      const variant = product.variants.id(variantId);
      if (!variant) throw new InputError("This variant no longer exists");
      variant.stock = stock;
    } else {
      if (product.variants.length) throw new InputError("Set stock on the product's variants");
      product.stock = stock;
    }
    await product.save();
    await revalidateStorefront(["products"], user.id);
    return product.stock;
  }, "Stock updated");
}
