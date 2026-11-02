"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Image from "next/image";
import {
  FormInputField,
  FormSelectField,
  FormEditorField,
  SectionCard,
  ColorInput,
  SizeInput,
  TypeSelector,
  LoadingButton,
} from "@/app/Components/FormComponents";
import {
  PRODUCT_TYPES,
  DEFAULT_SIZES,
} from "@/const/productData";
import SizeChartUploader from "../AddProduct/SizeChartUploader";

const EditForm = ({ product }) => {
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    buying_price: 0,
    price: 0,
    offerPercentage: 0,
    offerPrice: 0,
    description: "",
    moreInfo: "",
    returnsInfo: "",
    category: "",
    subcategory: "",
    type: [],
    availableSizes: DEFAULT_SIZES.clothing,
    imageUrl: [],
    sizeChart: "",
    colors: [{ name: "", productId: "", color: "" }],
  });
  const [uploadedImageNames, setUploadedImageNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [sizeChartUploading, setSizeChartUploading] = useState(false);
  const [sizeChartError, setSizeChartError] = useState("");

  // categories from API
  const [allCategoryItems, setAllCategoryItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (product) {
      const colors = product.colors?.map((color) => ({
        name: color.name || "",
        productId: color.productId || "",
        color: color.color || color.Color || "",
      })) || [{ name: "", productId: "", color: "" }];

      const initialSizes = product.availableSizes || DEFAULT_SIZES.clothing;

      setFormData({
        ...product,
        availableSizes: initialSizes,
        colors,
      });
    }
  }, [product]);

  // fetch categories from API on mount
  const fetchCategoriesFromApi = async () => {
    setCategoriesLoading(true);
    try {
      const res = await axios.get(`/api/categories`);
      const items = res.data?.categories || [];
      setAllCategoryItems(items);

      const seen = new Set();
      const opts = [];
      items.forEach((it) => {
        const cat = it.category || "";
        if (!cat) return;
        if (seen.has(cat)) return;
        seen.add(cat);
        opts.push({ value: String(cat).trim(), title: String(cat).trim() });
      });

      // include current product.category if missing
      if (formData.category && !seen.has(formData.category)) {
        opts.push({ value: formData.category, title: formData.category });
      }

      setCategories(opts);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setAllCategoryItems([]);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoriesFromApi();
    isMountedRef.current = true;
  }, []);

  // compute subcategories whenever selected category or items change
  useEffect(() => {
    if (!formData.category) return;
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

    if (formData.subcategory && !subsSet.has(formData.subcategory)) {
      subs.push({ value: formData.subcategory, title: formData.subcategory });
    }

    setSubcategories(subs);
  }, [formData.category, allCategoryItems]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let parsedValue = value;

    if (
      name === "price" ||
      name === "offerPercentage" ||
      name === "buying_price" ||
      name === "offerPrice"
    ) {
      parsedValue = value === "" ? "" : Number.parseFloat(value);
    }

    if (name === "category") {
      // compute subcategories for this new category
      const subsSet = new Set();
      const subs = [];
      allCategoryItems.forEach((it) => {
        if (String(it.category) === String(value) && it.subcategory) {
          const s = String(it.subcategory).trim();
          if (s && !subsSet.has(s)) {
            subsSet.add(s);
            subs.push({ value: s, title: s });
          }
        }
      });
      setSubcategories(subs);

      setFormData({
        ...formData,
        [name]: parsedValue,
        subcategory: "",
        availableSizes:
          value === "Footwear"
            ? DEFAULT_SIZES.Footwear
            : DEFAULT_SIZES.clothing,
      });
    } else {
      setFormData({ ...formData, [name]: parsedValue });
    }
  };

  const handleColorChange = (index, field, value) => {
    const updatedColors = [...(formData.colors || [])];
    const fieldName = field === "Color" ? "color" : field;
    updatedColors[index][fieldName] = value;
    setFormData({ ...formData, colors: updatedColors });
  };

  const addColor = () => {
    setFormData({
      ...formData,
      colors: [
        ...(formData.colors || []),
        { name: "", productId: "", color: "" },
      ],
    });
  };

  const removeColor = (index) => {
    if (formData.colors.length === 1) {
      toast.error("At least one color is required");
      return;
    }
    const updatedColors = formData.colors.filter((_, i) => i !== index);
    setFormData({ ...formData, colors: updatedColors });
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    setLoading(true);
    setImageError("");

    try {
      const uploadedImages = await Promise.all(
        [...files].map(async (file) => {
          const formData = new FormData();
          formData.append("files", file); // ORIGINAL FILE

          const response = await axios.post(
            "https://admin.clothtar.com/api/upload",
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );

          return response.data.files[0].url;
        }),
      );

      setFormData((prevData) => ({
        ...prevData,
        imageUrl: [...prevData.imageUrl, ...uploadedImages],
      }));
    } catch (error) {
      console.error("Upload error:", error);
      setImageError("Image upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = (index) => {
    const updatedImageUrl = formData.imageUrl.filter((_, i) => i !== index);
    const updatedImageNames = uploadedImageNames.filter((_, i) => i !== index);

    setFormData((prevData) => ({ ...prevData, imageUrl: updatedImageUrl }));
    setUploadedImageNames(updatedImageNames);
  };

  const handleSizeChartUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    setSizeChartUploading(true);
    setSizeChartError("");

    try {
      const file = files[0];

      // Step 1 — Optimize client-side
      let optimizedFile;
      try {
        optimizedFile = await optimizeImage(file);
      } catch (err) {
        console.error("Size chart optimization failed, using original:", err);
        optimizedFile = file;
      }

      // Step 2 — Upload to your server
      const formData = new FormData();
      formData.append("files", optimizedFile);

      const response = await axios.post(
        "https://admin.clothtar.com/api/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const uploadedUrl = response.data.files[0].url;

      // Step 3 — Save URL in form data
      setFormData((prev) => ({
        ...prev,
        sizeChart: uploadedUrl,
      }));

      toast.success("Size chart uploaded successfully!");
    } catch (error) {
      console.error("Size chart upload error:", error);
      setSizeChartError("Failed to upload size chart. Please try again.");
    } finally {
      setSizeChartUploading(false);
    }
  };

  const handleDeleteSizeChart = () => {
    setFormData((prev) => ({
      ...prev,
      sizeChart: "",
    }));
  };

  const handleSizeChange = (index, field, value) => {
    const updatedSizes = [...(formData.availableSizes || [])];

    if (field === "availability") {
      updatedSizes[index][field] = Math.max(0, Number(value) || 0);
    } else {
      updatedSizes[index][field] = value;
    }

    setFormData({ ...formData, availableSizes: updatedSizes });
  };

  const addSize = () => {
    setFormData({
      ...formData,
      availableSizes: [
        ...formData.availableSizes,
        { size: "", availability: 0, measurements: "" },
      ],
    });
  };

  const removeSize = (index) => {
    if (formData.availableSizes.length === 1) {
      toast.error("At least one size is required");
      return;
    }
    const updated = formData.availableSizes.filter((_, i) => i !== index);
    setFormData({ ...formData, availableSizes: updated });
  };

  const toggleType = (typeTitle) => {
    setFormData({
      ...formData,
      type: formData.type.includes(typeTitle)
        ? formData.type.filter((t) => t !== typeTitle)
        : [...formData.type, typeTitle],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    const dataToUpdate = { ...formData };
    delete dataToUpdate._id;
    delete dataToUpdate.serial;

    try {
      await axios.put(`/api/product/${formData.id}`, dataToUpdate);
      toast.success("Product updated successfully!");
    } catch (error) {
      console.error("Update error:", error.response?.data || error.message);
      toast.error(
        error.response?.data?.message ||
          "Error updating product. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
        <p className="text-gray-600 mt-2">
          Update product details and information
        </p>
      </div>

      {/* Basic Information */}
      <SectionCard title="Basic Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormInputField
            label="Product ID"
            name="id"
            value={formData.id || ""}
            onChange={handleChange}
            placeholder="e.g., PROD001"
            required
            disabled
          />
          <FormInputField
            label="Product Name"
            name="name"
            value={formData.name || ""}
            onChange={handleChange}
            placeholder="Enter product name"
            required
          />
        </div>
      </SectionCard>

      {/* Pricing */}
      <SectionCard title="Pricing">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <FormInputField
            label="Buying Price"
            name="buying_price"
            type="number"
            value={formData.buying_price || ""}
            onChange={handleChange}
            min="0"
          />
          <FormInputField
            label="Selling Price"
            name="price"
            type="number"
            value={formData.price || ""}
            onChange={handleChange}
            placeholder="0.00"
            min="0"
            required
          />
          <FormInputField
            label="Discount %"
            name="offerPercentage"
            type="number"
            value={formData.offerPercentage || ""}
            onChange={handleChange}
            min="0"
          />
          <FormInputField
            label="Final Price"
            name="offerPrice"
            type="number"
            value={formData.offerPrice || ""}
            onChange={handleChange}
            min="0"
          />
        </div>
      </SectionCard>

      {/* Descriptions */}
      <SectionCard title="Product Details">
        <FormEditorField
          label="Description"
          value={formData.description || ""}
          onChange={(content) =>
            setFormData({ ...formData, description: content })
          }
          height="300px"
        />
        <FormEditorField
          label="More Information"
          value={formData.moreInfo || ""}
          onChange={(content) =>
            setFormData({ ...formData, moreInfo: content })
          }
          height="250px"
        />
        <FormEditorField
          label="Return Policy"
          value={formData.returnsInfo || ""}
          onChange={(content) =>
            setFormData({ ...formData, returnsInfo: content })
          }
          height="250px"
        />
      </SectionCard>

      {/* Category & Type */}
      <SectionCard title="Category & Type">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormSelectField
            label="Category"
            name="category"
            value={formData.category || ""}
            onChange={handleChange}
            options={categories}
            required
          />
          {subcategories.length > 0 && (
            <FormSelectField
              label="Subcategory"
              name="subcategory"
              value={formData.subcategory || ""}
              onChange={handleChange}
              options={subcategories}
              required
            />
          )}
        </div>

        <div className="mt-6 space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Product Type
          </label>
          <TypeSelector
            selectedTypes={formData.type}
            onTypeToggle={toggleType}
          />
          <div className="grid grid-cols-3 gap-2">
            {PRODUCT_TYPES.map((type, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleType(type.title)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  formData.type.includes(type.title)
                    ? "bg-blue-600 text-white border border-blue-600"
                    : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                }`}
              >
                {type.title}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Colors */}
      <SectionCard title="Color Variants">
        <div className="space-y-3">
          {formData.colors?.map((color, index) => (
            <ColorInput
              key={index}
              color={color}
              index={index}
              onColorChange={handleColorChange}
              onRemove={removeColor}
              canRemove={formData.colors.length > 1}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addColor}
          className="mt-4 px-4 py-2 text-blue-600 font-semibold hover:text-blue-700 hover:underline"
        >
          + Add Color Variant
        </button>
      </SectionCard>

      {/* Size Chart & Sizes */}
      <SectionCard title="Size Information">
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Size Chart Image
          </label>
          <SizeChartUploader product={formData} setProduct={setFormData} />
        </div>

        <div className="space-y-3">
          {formData.availableSizes.map((size, index) => (
            <SizeInput
              key={index}
              size={size}
              index={index}
              onSizeChange={handleSizeChange}
              onRemove={removeSize}
              category={formData.category}
              canRemove={formData.availableSizes.length > 1}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addSize}
          className="mt-4 px-4 py-2 text-blue-600 font-semibold hover:text-blue-700 hover:underline"
        >
          + Add Size
        </button>
      </SectionCard>

      {/* Product Images */}
      <SectionCard title="Product Images">
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Upload New Images
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {imageError && (
            <p className="text-red-600 text-sm mt-2">{imageError}</p>
          )}
          {loading && (
            <p className="text-blue-600 text-sm mt-2">Uploading images...</p>
          )}
        </div>

        {formData.imageUrl.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">
              Current Images ({formData.imageUrl.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {formData.imageUrl?.map((image, index) => (
                <div
                  key={index}
                  className="relative group rounded-lg overflow-hidden border border-gray-200"
                >
                  <Image
                    src={image}
                    alt={`Product ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(index)}
                    className="absolute inset-0 bg-red-600 bg-opacity-0 group-hover:bg-opacity-80 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    <span className="text-white font-semibold">Delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Submit Button */}
      <div className="flex gap-4 pt-6">
        <LoadingButton type="submit" loading={uploading}>
          {uploading ? "Updating Product..." : "Update Product"}
        </LoadingButton>
      </div>
    </form>
  );
};

export default EditForm;
