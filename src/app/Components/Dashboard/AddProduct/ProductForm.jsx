"use client";

import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
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
import SizeChartUploader from "./SizeChartUploader";

const ProductForm = () => {
  const [product, setProduct] = useState({
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

  // Categories fetched from API
  const [allCategoryItems, setAllCategoryItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Handle form input changes
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

    setProduct({ ...product, [name]: parsedValue });
  };

  // Fetch categories & subcategories from API
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
      setCategories(opts);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setAllCategoryItems([]);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Handle category change with default sizes
  const handleCategoryChange = (e) => {
    const selectedCategory = e.target.value;
    const defaultSizes =
      selectedCategory === "Footwear"
        ? DEFAULT_SIZES.Footwear
        : DEFAULT_SIZES.clothing;

    // compute subcategories for selected category
    const subsSet = new Set();
    const subs = [];
    allCategoryItems.forEach((it) => {
      if (String(it.category) === String(selectedCategory) && it.subcategory) {
        const s = String(it.subcategory).trim();
        if (s && !subsSet.has(s)) {
          subsSet.add(s);
          subs.push({ value: s, title: s });
        }
      }
    });

    setSubcategories(subs);

    setProduct({
      ...product,
      category: selectedCategory,
      subcategory: "",
      availableSizes: defaultSizes,
    });
  };

  // Handle color changes
  const handleColorChange = (index, field, value) => {
    const updatedColors = [...product.colors];
    updatedColors[index][field] = value;
    setProduct({ ...product, colors: updatedColors });
  };

  const addColor = () => {
    setProduct({
      ...product,
      colors: [...product.colors, { name: "", productId: "", color: "" }],
    });
  };

  const removeColor = (index) => {
    if (product.colors.length === 1) {
      toast.error("At least one color is required");
      return;
    }
    const updatedColors = product.colors.filter((_, i) => i !== index);
    setProduct({ ...product, colors: updatedColors });
  };

  // Handle size changes
  const handleSizeChange = (index, field, value) => {
    const updatedSizes = [...(product.availableSizes || [])];

    if (field === "availability") {
      updatedSizes[index][field] = Math.max(0, Number(value) || 0);
    } else {
      updatedSizes[index][field] = value;
    }

    setProduct({ ...product, availableSizes: updatedSizes });
  };

  const addSize = () => {
    setProduct({
      ...product,
      availableSizes: [
        ...product.availableSizes,
        { size: "", availability: 0, measurements: "" },
      ],
    });
  };

  const removeSize = (index) => {
    if (product.availableSizes.length === 1) {
      toast.error("At least one size is required");
      return;
    }
    const updated = product.availableSizes.filter((_, i) => i !== index);
    setProduct({ ...product, availableSizes: updated });
  };

  // Handle image upload
  const onDrop = useCallback(async (acceptedFiles) => {
    setLoading(true);
    setImageError("");

    try {
      const formData = new FormData();
      acceptedFiles.forEach((file) => formData.append("files", file));

      const response = await axios.post(
        "https://admin.clothtar.com/api/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const urls = response.data.files.map((img) => img.url);
      setProduct((prev) => ({
        ...prev,
        imageUrl: [...prev.imageUrl, ...urls],
      }));
    } catch (error) {
      console.error("Error uploading image:", error);
      setImageError("Image upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleDeleteImage = (index) => {
    const updatedImageUrl = product.imageUrl.filter((_, i) => i !== index);
    const updatedImageNames = uploadedImageNames.filter((_, i) => i !== index);

    setProduct({ ...product, imageUrl: updatedImageUrl });
    setUploadedImageNames(updatedImageNames);
  };

  // Handle type toggle
  const toggleType = (typeTitle) => {
    setProduct({
      ...product,
      type: product.type.includes(typeTitle)
        ? product.type.filter((t) => t !== typeTitle)
        : [...product.type, typeTitle],
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const response = await axios.post("/api/product", product);
      toast.success("Product added successfully!");
      // Keep form data visible after successful submission
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.response?.data?.message || "Failed to add product");
    } finally {
      setUploading(false);
    }
  };

  // fetch categories on mount
  useEffect(() => {
    fetchCategoriesFromApi();
  }, []);

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
        <p className="text-gray-600 mt-2">
          Create a new product and manage its details
        </p>
      </div>

      {/* Basic Information */}
      <SectionCard title="Basic Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormInputField
            label="Product ID"
            name="id"
            value={product.id}
            onChange={handleChange}
            placeholder="e.g., PROD001"
            required
          />
          <FormInputField
            label="Product Name"
            name="name"
            value={product.name}
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
            value={product.buying_price}
            onChange={handleChange}
            min="0"
          />
          <FormInputField
            label="Selling Price"
            name="price"
            type="number"
            value={product.price}
            onChange={handleChange}
            placeholder="0.00"
            min="0"
            required
          />
          <FormInputField
            label="Discount %"
            name="offerPercentage"
            type="number"
            value={product.offerPercentage}
            onChange={handleChange}
            min="0"
          />
          <FormInputField
            label="Final Price"
            name="offerPrice"
            type="number"
            value={product.offerPrice}
            onChange={handleChange}
            min="0"
          />
        </div>
      </SectionCard>

      {/* Descriptions */}
      <SectionCard title="Product Details">
        <FormEditorField
          label="Description"
          value={product.description}
          onChange={(content) =>
            setProduct({ ...product, description: content })
          }
          height="300px"
        />
        <FormEditorField
          label="More Information"
          value={product.moreInfo}
          onChange={(content) => setProduct({ ...product, moreInfo: content })}
          height="250px"
        />
        <FormEditorField
          label="Return Policy"
          value={product.returnsInfo}
          onChange={(content) =>
            setProduct({ ...product, returnsInfo: content })
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
            value={product.category}
            onChange={handleCategoryChange}
            options={categories}
            required
          />
          {subcategories.length > 0 && (
            <FormSelectField
              label="Subcategory"
              name="subcategory"
              value={product.subcategory}
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
            selectedTypes={product.type}
            onTypeToggle={toggleType}
          />
          <div className="grid grid-cols-3 gap-2">
            {PRODUCT_TYPES.map((type, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleType(type.title)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  product.type.includes(type.title)
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
          {product.colors.map((color, index) => (
            <ColorInput
              key={index}
              color={color}
              index={index}
              onColorChange={handleColorChange}
              onRemove={removeColor}
              canRemove={product.colors.length > 1}
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

      {/* Size Chart */}
      <SectionCard title="Size Information">
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Size Chart Image
          </label>
          <SizeChartUploader product={product} setProduct={setProduct} />
        </div>

        <div className="space-y-3">
          {product.availableSizes.map((size, index) => (
            <SizeInput
              key={index}
              size={size}
              index={index}
              onSizeChange={handleSizeChange}
              onRemove={removeSize}
              category={product.category}
              canRemove={product.availableSizes.length > 1}
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
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <svg
              className="w-12 h-12 mx-auto text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {isDragActive ? (
              <p className="text-blue-600 font-semibold">Drop files here...</p>
            ) : (
              <>
                <p className="text-gray-900 font-semibold">
                  Drag and drop images here
                </p>
                <p className="text-gray-600 text-sm">
                  or click to select files
                </p>
              </>
            )}
          </div>
        </div>
        {imageError && (
          <p className="text-red-600 text-sm mt-2">{imageError}</p>
        )}
        {loading && (
          <p className="text-blue-600 text-sm mt-2">Uploading images...</p>
        )}

        {product.imageUrl.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">
              Uploaded Images ({product.imageUrl.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {product.imageUrl.map((image, index) => (
                <div
                  key={index}
                  className="relative group rounded-lg overflow-hidden border border-gray-200"
                >
                  <Image
                    src={image}
                    alt={`Product ${index + 1}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-contain"
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
          {uploading ? "Adding Product..." : "Add Product"}
        </LoadingButton>
      </div>
    </form>
  );
};

export default ProductForm;
