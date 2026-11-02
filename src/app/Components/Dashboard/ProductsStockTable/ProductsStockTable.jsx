"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ProductsStockTable({
  products = [],
  totalPages = 1,
  currentPage = 1,
  sortBy = "",
}) {
  const [page, setPage] = useState(currentPage);
  const [sortOption, setSortOption] = useState(sortBy);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const router = useRouter();

  // Initialize filters from URL if present
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category") || "all";
    const sort = params.get("sortBy") || "";
    const p = parseInt(params.get("page") || "1", 10);
    setCategoryFilter(cat);
    setSortOption(sort);
    setPage(isNaN(p) ? 1 : p);
  }, []);

  // Sample data based on your actual data structure
  const sampleProducts = products.length ? products : [];

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(null);

  useEffect(() => {
    // Fetch categories from public API and build unique options (use subcategory when present, otherwise category)
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      setCategoriesError(null);
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.categories || [];
        const seen = new Set();
        const opts = [];
        items.forEach((it) => {
          const cat = it.category || "";
          const sub =
            it.subcategory || it.subcategory === "" ? it.subcategory : null;
          const value =
            sub && String(sub).trim() !== ""
              ? String(sub).trim()
              : String(cat).trim();
          if (!value) return;
          if (seen.has(value)) return;
          seen.add(value);
          const label =
            sub && String(sub).trim() !== "" ? `${cat} / ${sub}` : cat;
          opts.push({ value, label });
        });
        setCategoryOptions(opts);
      } catch (err) {
        console.error("Categories fetch error:", err);
        setCategoriesError(err.message || String(err));
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Calculate total stock for a product
  const calculateTotalStock = (availableSizes) => {
    return (
      availableSizes?.reduce((total, size) => {
        const availability = parseInt(size.availability) || 0;
        return total + availability;
      }, 0) || 0
    );
  };

  const handleCategoryChange = (event) => {
    const newCategory = event.target.value;
    setCategoryFilter(newCategory);
    setPage(1);

    let url = `/dashboard/stock?page=1&category=${newCategory}`;
    if (sortOption) {
      url += `&sortBy=${sortOption}`;
    }
    router.push(url);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);

    let url = `/dashboard/stock?page=${newPage}`;
    if (sortOption) {
      url += `&sortBy=${sortOption}`;
    }
    if (categoryFilter !== "all") {
      url += `&category=${categoryFilter}`;
    }
    router.push(url);
  };

  const handleSortChange = (event) => {
    const newSortOption = event.target.value;
    setSortOption(newSortOption);
    setPage(1);

    let url = `/dashboard/stock?page=1&sortBy=${newSortOption}`;
    if (categoryFilter !== "all") {
      url += `&category=${categoryFilter}`;
    }
    router.push(url);
  };

  const handleEditProduct = (product) => {
    router.push(`/dashboard/edit-product/${product.id}`);
  };

  const handleReset = () => {
    setSortOption("");
    setCategoryFilter("all");
    setPage(1);
    router.push("/dashboard/stock");
  };

  const getStockBadgeColor = (availability) => {
    if (availability > 10) return "bg-green-500";
    if (availability > 0) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStockBadgeStyle = (availability) => {
    const baseStyle =
      "inline-flex items-center justify-center min-w-[32px] h-6 px-2 text-xs font-medium text-white rounded-full";
    return `${baseStyle} ${getStockBadgeColor(availability)}`;
  };

  const getTotalStockBadgeStyle = (total) => {
    const baseStyle =
      "inline-flex items-center justify-center min-w-[40px] h-8 px-3 text-sm font-bold text-white rounded-full";
    return `${baseStyle} ${getStockBadgeColor(total)}`;
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (page > 1) {
      pages.push(
        <button
          key="prev"
          onClick={() => handlePageChange(page - 1)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-l-md hover:bg-gray-50 transition-colors"
        >
          ‹
        </button>,
      );
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 text-sm border-t border-b border-r border-gray-300 transition-colors ${
            i === page
              ? "bg-blue-500 text-white border-blue-500"
              : "hover:bg-gray-50"
          }`}
        >
          {i}
        </button>,
      );
    }

    if (page < totalPages) {
      pages.push(
        <button
          key="next"
          onClick={() => handlePageChange(page + 1)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-r-md hover:bg-gray-50 transition-colors"
        >
          ›
        </button>,
      );
    }

    return <div className="flex">{pages}</div>;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          Product Stock Inventory
        </h2>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">
                Filters:
              </span>
            </div>

            <select
              value={sortOption}
              onChange={handleSortChange}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sort by</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>

            <select
              value={categoryFilter}
              onChange={handleCategoryChange}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categoriesLoading ? (
                <option value="">Loading...</option>
              ) : categoriesError ? (
                <option value="">Failed to load</option>
              ) : (
                categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reset Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[200px]">
                Product Name
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 min-w-[120px]">
                Total Stock
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 min-w-[100px]">
                Product ID
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 min-w-[100px]">
                Image
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-white bg-blue-500 min-w-[250px]">
                Sizes Stock
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 min-w-[100px]">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sampleProducts.map((product, index) => {
              const totalStock = calculateTotalStock(product.availableSizes);

              return (
                <tr
                  key={product._id || index}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500">{product.id}</div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <span className={getTotalStockBadgeStyle(totalStock)}>
                      {totalStock}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[32px] h-6 px-2 text-xs font-medium text-white bg-green-500 rounded-full">
                      {product.id}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden border">
                        {/* <img
                          src={
                            product.imageUrl?.[0] || "/api/placeholder/150/150"
                          }
                          alt={product.name}
                          className="w-full h-full object-cover"
                        /> */}
                        <Image
                          src={product.imageUrl?.[0]}
                          alt={product.name}
                          width={500}
                          height={500}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {product.availableSizes?.map((sizeInfo, sizeIndex) => {
                        const availability =
                          parseInt(sizeInfo.availability) || 0;
                        return (
                          <div
                            key={`${product._id}-${sizeInfo.size}-${sizeIndex}`}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded border"
                          >
                            <span className="text-xl font-medium text-gray-700">
                              {sizeInfo.size}:
                            </span>
                            <span className={getStockBadgeStyle(availability)}>
                              {availability}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    >
                      EDIT
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {page} of {totalPages}
          </div>
          {totalPages > 1 && renderPagination()}
        </div>
      </div>
    </div>
  );
}
