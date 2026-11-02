"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FormInputField,
  FormSelectField,
  FormEditorField,
  SectionCard,
  LoadingButton,
} from "@/app/Components/FormComponents";

const CATEGORY_TYPES = [
  { value: "collection", title: "Collection" },
  { value: "accessories", title: "Accessories" },
];

const CategoryForm = ({ initialData }) => {
  const [formData, setFormData] = useState({
    type: initialData?.type || "collection",
    // For existing selections these will be populated; when adding new we'll set category/subcategory to their slugs
    category: initialData?.category || "",
    subcategory: initialData?.subcategory || "",
    // Name fields for creating new category/subcategory
    categoryName: initialData?.categoryName || "",
    categorySlug: initialData?.categorySlug || "",
    subcategoryName: initialData?.subcategoryName || "",
    subcategorySlug: initialData?.subcategorySlug || "",

    description: initialData?.description || "",
    metaTitle: initialData?.metaTitle || "",
    metaDescription: initialData?.metaDescription || "",
  });

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Flags to control adding new entries
  const [addNewCategory, setAddNewCategory] = useState(false);
  const [addNewSubcategory, setAddNewSubcategory] = useState(false);

  // Slug edit toggles and validation
  const [categorySlugEditable, setCategorySlugEditable] = useState(false);
  const [subcategorySlugEditable, setSubcategorySlugEditable] = useState(false);
  const [slugErrors, setSlugErrors] = useState({ category: "", subcategory: "" });
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const prevTypeRef = useRef(formData.type);
  const prevCategoryRef = useRef(formData.category);
  const isMountedRef = useRef(false);


  // Helper to generate slug from a name
  const generateSlug = (name) =>
    name
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-") // replace spaces with -
      .replace(/[^a-z0-9-]/g, "-") // replace invalid chars with -
      .replace(/-+/g, "-") // collapse multiple -
      .replace(/(^-|-$)/g, ""); // remove leading/trailing -

  // Raw items fetched from API (each item is a category record with category/subcategory/type)
  const [allCategoryItems, setAllCategoryItems] = useState([]);

  // Fetch categories from API and build options
  const fetchCategoriesFromApi = async (type, options = {}) => {
    try {
      const query = type ? `?type=${encodeURIComponent(type)}` : "";
      const res = await axios.get(`/api/categories${query}`);
      const items = res.data?.categories || [];
      setAllCategoryItems(items);

      // Build unique top-level category options
      const seen = new Set();
      const opts = [];
      items.forEach((it) => {
        const cat = it.category || "";
        if (!cat) return;
        if (seen.has(cat)) return;
        seen.add(cat);
        opts.push({ value: String(cat).trim(), title: String(cat).trim() });
      });

      // Ensure initial selected category (if any) is included
      if (initialData?.category && !seen.has(initialData.category)) {
        opts.push({ value: initialData.category, title: initialData.category });
      }

      setCategories(opts);

      // Show a small success indicator when requested (e.g., after create/update)
      if (options.showSuccess) {
        setRefreshSuccess(true);
        setTimeout(() => setRefreshSuccess(false), 2000);
      }

      // If editing and there's an initial value, preselect it if formData.category is empty
      if (initialData?.category && !formData.category) {
        setFormData((prev) => ({ ...prev, category: initialData.category }));
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setAllCategoryItems([]);
      setCategories([]);
    }
  };

  // Initialize and update categories when type changes — only reset fields when the type actually changed by the user
  useEffect(() => {
    const prevType = prevTypeRef.current;
    // Fetch new list regardless
    fetchCategoriesFromApi(formData.type);

    if (prevType !== formData.type && isMountedRef.current) {
      // user changed type after mount: reset selections
      setFormData((prev) => ({
        ...prev,
        category: "",
        subcategory: "",
        categoryName: "",
        categorySlug: "",
        subcategoryName: "",
        subcategorySlug: "",
      }));
      setAddNewCategory(false);
      setAddNewSubcategory(false);
    }

    prevTypeRef.current = formData.type;
    isMountedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.type]);

  // Update subcategories based on selected category (only from fetched items)
  useEffect(() => {
    const prevCat = prevCategoryRef.current;

    if (formData.category && !addNewCategory) {
      const subsSet = new Set();
      const subs = [];
      allCategoryItems.forEach((it) => {
        if (String(it.category) === String(formData.category) && it.subcategory) {
          const s = String(it.subcategory).trim();
          if (s && !subsSet.has(s)) {
            subsSet.add(s);
            subs.push({ value: s, title: s });
          }
        }
      });

      // If initialData.subcategory exists but not present in fetched subs, include it
      if (initialData?.subcategory && !subsSet.has(initialData.subcategory)) {
        subs.push({ value: initialData.subcategory, title: initialData.subcategory });
      }

      setSubcategories(subs);

      // If editing and there's an initial subcategory, preselect it when form doesn't have one yet
      if (initialData?.subcategory && !formData.subcategory) {
        setFormData((prev) => ({ ...prev, subcategory: initialData.subcategory }));
      }
    } else {
      setSubcategories([]);
    }

    // Only clear subcategory inputs when the category actually changed after mount
    if (prevCat !== formData.category && isMountedRef.current) {
      setFormData((prev) => ({
        ...prev,
        subcategory: "",
        subcategoryName: "",
        subcategorySlug: "",
      }));
      setAddNewSubcategory(false);
    }

    prevCategoryRef.current = formData.category;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category, addNewCategory, allCategoryItems]);

  const checkSlugUnique = async (slug, field) => {
    if (!slug) return true;
    setIsCheckingSlug(true);
    try {
      // Fetch all categories (could be improved with a dedicated endpoint)
      const res = await axios.get(`/api/categories`);
      const items = res.data?.categories || [];
      let exists = false;

      if (field === "category") {
        exists = items.some((it) => String(it.category) === String(slug) && it._id !== initialData?._id);
      } else {
        // subcategory uniqueness scoped to the selected category
        exists = items.some(
          (it) => String(it.subcategory) === String(slug) && String(it.category) === String(formData.category) && it._id !== initialData?._id,
        );
      }

      setIsCheckingSlug(false);
      if (exists) {
        setSlugErrors((prev) => ({ ...prev, [field]: `${field} slug already exists` }));
        return false;
      }
      setSlugErrors((prev) => ({ ...prev, [field]: "" }));
      return true;
    } catch (err) {
      setIsCheckingSlug(false);
      console.error("Slug check failed:", err);
      return true; // allow by default on error
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // If user types a category name for a new category, auto-generate slug
    if (name === "categoryName") {
      const slug = generateSlug(value);
      setFormData((prev) => ({ ...prev, categoryName: value, categorySlug: slug }));
      // validate generated slug
      checkSlugUnique(slug, "category");
      return;
    }

    if (name === "subcategoryName") {
      const slug = generateSlug(value);
      setFormData((prev) => ({ ...prev, subcategoryName: value, subcategorySlug: slug }));
      // validate generated slug
      checkSlugUnique(slug, "subcategory");
      return;
    }

    // If user selects an existing category, ensure addNewCategory is false
    if (name === "category") {
      setAddNewCategory(false);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditorChange = (value) => {
    setFormData((prev) => ({ ...prev, description: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate slugs if creating new entries
      if (addNewCategory && formData.categorySlug) {
        const ok = await checkSlugUnique(formData.categorySlug, "category");
        if (!ok) {
          toast.error("Category slug already exists");
          setLoading(false);
          return;
        }
      }
      if (addNewSubcategory && formData.subcategorySlug) {
        const ok2 = await checkSlugUnique(formData.subcategorySlug, "subcategory");
        if (!ok2) {
          toast.error("Subcategory slug already exists");
          setLoading(false);
          return;
        }
      }

      // Build payload
      const payload = { ...formData };

      // If creating a new category, set category to slug and include categoryName
      if (addNewCategory && formData.categoryName) {
        payload.category = formData.categorySlug;
        payload.categoryName = formData.categoryName;
      }

      // If creating a new subcategory, set subcategory to slug and include subcategoryName
      if (addNewSubcategory && formData.subcategoryName) {
        payload.subcategory = formData.subcategorySlug;
        payload.subcategoryName = formData.subcategoryName;
      }

      // Clean up helper fields not needed by backend
      // (optional) remove categoryName/categorySlug/subcategoryName/subcategorySlug if backend doesn't expect them

      if (initialData?._id) {
        // Update existing category
        await axios.put(`/api/categories/${initialData._id}`, payload);
        toast.success("Category updated successfully!");
        // Refresh the local category lists so edits are immediately reflected
        await fetchCategoriesFromApi(payload.type || formData.type, { showSuccess: true });
      } else {
        // Create new category
        await axios.post("/api/categories", payload);
        toast.success("Category created successfully!");
        // Refresh categories so the newly-created entry is available in selects
        await fetchCategoriesFromApi(payload.type || formData.type, { showSuccess: true });
        // Reset form
        setFormData({
          type: "collection",
          category: "",
          subcategory: "",
          categoryName: "",
          categorySlug: "",
          subcategoryName: "",
          subcategorySlug: "",
          description: "",
          metaTitle: "",
          metaDescription: "",
        });
        setAddNewCategory(false);
        setAddNewSubcategory(false);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.response?.data?.message || "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6 pb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {initialData?._id ? "Edit Category" : "Create New Category"}
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-gray-600 mt-2">
            {initialData?._id
              ? "Update category details and metadata"
              : "Add a new product category or accessory"}
          </p>
          {refreshSuccess && (
            <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">Categories refreshed</span>
          )}
        </div>
      </div>

      {/* Category Information */}
      <SectionCard title="Category Information">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <FormSelectField
            label="Type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            options={CATEGORY_TYPES}
            placeholder="Select type"
          />

          {/* Category select or new category inputs */}
          <div>
            {!addNewCategory ? (
              <>
                <FormSelectField
                  label={formData.type === "collection" ? "Category" : "Accessory"}
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  options={categories}
                  placeholder={`Select ${formData.type}`}
                />
                <div className="mt-2">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => {
                      setAddNewCategory(true);
                      // clear selection so user starts fresh
                      setFormData((prev) => ({
                        ...prev,
                        category: "",
                        categoryName: "",
                        categorySlug: "",
                      }));
                    }}
                  >
                    + Add new {formData.type === "collection" ? "Category" : "Accessory"}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <FormInputField
                  label={`New ${formData.type === "collection" ? "Category" : "Accessory"} Name`}
                  name="categoryName"
                  value={formData.categoryName}
                  onChange={handleChange}
                  placeholder="Type category name"
                />
                <FormInputField
                  label="Slug"
                  name="categorySlug"
                  value={formData.categorySlug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, categorySlug: e.target.value }))}
                  placeholder="auto-generated-slug"
                  disabled={!categorySlugEditable}
                  helperText={slugErrors.category || (categorySlugEditable ? "You can edit the slug" : "Slug is auto-generated from name. Click Edit to change.")}
                />
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => setCategorySlugEditable((s) => !s)}
                  >
                    {categorySlugEditable ? "Lock slug" : "Edit slug"}
                  </button>
                  <button
                    type="button"
                    className="text-sm text-gray-600 hover:underline"
                    onClick={() => checkSlugUnique(formData.categorySlug, "category")}
                  >
                    Check availability
                  </button>
                  {isCheckingSlug && <span className="text-sm text-gray-500">Checking...</span>}
                </div>
                <div>
                  <button
                    type="button"
                    className="text-sm text-gray-600 hover:underline"
                    onClick={() => {
                      setAddNewCategory(false);
                      setFormData((prev) => ({ ...prev, categoryName: "", categorySlug: "" }));
                    }}
                  >
                    Cancel new category
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Subcategory select or new subcategory inputs */}
          <div>
            {!addNewSubcategory && subcategories.length > 0 ? (
              <>
                <FormSelectField
                  label="Subcategory"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                  options={subcategories}
                  placeholder="Select subcategory"
                />
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => {
                      setAddNewSubcategory(true);
                      setFormData((prev) => ({
                        ...prev,
                        subcategory: "",
                        subcategoryName: "",
                        subcategorySlug: "",
                      }));
                    }}
                  >
                    + Add subcategory
                  </button>
                  {/* Allow explicitly choosing to not have subcategory */}
                  <button
                    type="button"
                    className="text-sm text-gray-600 hover:underline"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, subcategory: "" }));
                    }}
                  >
                    No subcategory
                  </button>
                </div>
              </>
            ) : addNewSubcategory ? (
              <div className="space-y-2">
                <FormInputField
                  label="New Subcategory Name"
                  name="subcategoryName"
                  value={formData.subcategoryName}
                  onChange={handleChange}
                  placeholder="Type subcategory name"
                />
                <FormInputField
                  label="Slug"
                  name="subcategorySlug"
                  value={formData.subcategorySlug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subcategorySlug: e.target.value }))}
                  placeholder="auto-generated-slug"
                  disabled={!subcategorySlugEditable}
                  helperText={slugErrors.subcategory || (subcategorySlugEditable ? "You can edit the slug" : "Slug is auto-generated from name. Click Edit to change.")}
                />
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => setSubcategorySlugEditable((s) => !s)}
                  >
                    {subcategorySlugEditable ? "Lock slug" : "Edit slug"}
                  </button>
                  <button
                    type="button"
                    className="text-sm text-gray-600 hover:underline"
                    onClick={() => checkSlugUnique(formData.subcategorySlug, "subcategory")}
                  >
                    Check availability
                  </button>
                  {isCheckingSlug && <span className="text-sm text-gray-500">Checking...</span>}
                </div>
                <div>
                  <button
                    type="button"
                    className="text-sm text-gray-600 hover:underline"
                    onClick={() => {
                      setAddNewSubcategory(false);
                      setFormData((prev) => ({ ...prev, subcategoryName: "", subcategorySlug: "" }));
                    }}
                  >
                    Cancel new subcategory
                  </button>
                </div>
              </div>
            ) : (
              // If there are no existing subcategories, show "Add subcategory" button
              <div className="mt-2">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline"
                  onClick={() => setAddNewSubcategory(true)}
                >
                  + Add subcategory
                </button>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Content */}
      <SectionCard title="Content">
        <FormEditorField
          label="Description"
          value={formData.description}
          onChange={handleEditorChange}
          placeholder="Enter description (Optional)"
        />
      </SectionCard>

      {/* SEO Metadata */}
      <SectionCard title="SEO Metadata">
        <div className="grid grid-cols-1 gap-6">
          <FormInputField
            label="Meta Title"
            name="metaTitle"
            value={formData.metaTitle}
            onChange={handleChange}
            placeholder="e.g., Buy Winter Hoodies Online | Your Brand (Optional)"
          />
          <FormInputField
            label="Meta Description"
            name="metaDescription"
            value={formData.metaDescription}
            onChange={handleChange}
            placeholder="e.g., Explore our premium hoodie collection designed for warmth and comfort... (Optional)"
          />
        </div>
      </SectionCard>

      {/* Submit Button */}
      <LoadingButton
        loading={loading}
        type="submit"
        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
      >
        {initialData?._id ? "Update Category" : "Create Category"}
      </LoadingButton>
    </form>
  );
};

export default CategoryForm;
