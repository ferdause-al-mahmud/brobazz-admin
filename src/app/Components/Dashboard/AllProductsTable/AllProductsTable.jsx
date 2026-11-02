"use client";
import { Pagination } from "@mui/material";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AiFillDelete } from "react-icons/ai";
import Link from "next/link";
import { confirmAlert } from "react-confirm-alert"; // Import confirmAlert
import "react-confirm-alert/src/react-confirm-alert.css"; // Import styles
import toast from "react-hot-toast";

const AllProductsTable = ({ products, totalPages, currentPage, sortBy }) => {
  const [page, setPage] = useState(currentPage || 1);
  const [sortOption, setSortOption] = useState(sortBy || "");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productList, setProductList] = useState(products || []);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(null);
  const router = useRouter();

  // Initialize filters from URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setCategoryFilter(params.get("category") || "all");
    setSortOption(params.get("sortBy") || "");
    setPage(parseInt(params.get("page") || "1", 10));
  }, []);

  useEffect(() => {
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

  // Update productList when products prop changes
  useEffect(() => {
    setProductList(products || []);
  }, [products]);

  // Handle page change and update the URL
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    const catParam =
      categoryFilter && categoryFilter !== "all"
        ? `&category=${encodeURIComponent(categoryFilter)}`
        : "";
    router.push(
      `/dashboard/all-products?page=${newPage}&sortBy=${sortOption}${catParam}`,
    );
  };

  // Handle sort option change
  const handleSortChange = (event) => {
    const newSortOption = event.target.value;
    setSortOption(newSortOption);
    setPage(1);
    const catParam =
      categoryFilter && categoryFilter !== "all"
        ? `&category=${encodeURIComponent(categoryFilter)}`
        : "";
    router.push(
      `/dashboard/all-products?page=1&sortBy=${newSortOption}${catParam}`,
    );
  };

  // Function to handle delete
  const handleDeleteProduct = (productId) => {
    confirmAlert({
      title: "Confirm to Delete",
      message: "Are you sure you want to delete this product?",
      buttons: [
        {
          label: "Yes",
          onClick: async () => {
            try {
              await fetch(`/api/product/${productId}`, {
                method: "DELETE",
              });
              toast.success("Product deleted successfully!");
              // Remove the product from the local state instead of reloading
              setProductList(
                productList.filter((product) => product.id !== productId),
              );
            } catch (error) {
              console.error("Error deleting product:", error);
              toast.error("Failed to delete product. Please try again.");
            }
          },
        },
        {
          label: "No",
          onClick: () => {},
        },
      ],
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center">
          <label htmlFor="sort" className=" text-black font-bold mr-3">
            Sort by:
          </label>
          <select
            id="sort"
            value={sortOption}
            onChange={handleSortChange}
            className="border border-gray-400 bg-[#242833] text-white p-2 rounded"
          >
            <option value="newest" className="bg-[#242833] text-white">
              Newest
            </option>
            <option value="oldest" className="bg-[#242833] text-white">
              Oldest
            </option>
          </select>
        </div>

        <div className="flex items-center">
          <label htmlFor="category" className=" text-black font-bold mr-3">
            Category:
          </label>
          <select
            id="category"
            value={categoryFilter}
            onChange={(e) => {
              const val = e.target.value;
              setCategoryFilter(val);
              setPage(1);
              router.push(
                `/dashboard/all-products?page=1&sortBy=${sortOption}&category=${encodeURIComponent(val)}`,
              );
            }}
            className="border border-gray-400 bg-[#242833] text-white p-2 rounded"
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
      </div>

      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="px-4 py-2 border">Product ID</th>
            <th className="px-4 py-2 border">Product Image</th>
            <th className="px-4 py-2 border">Added Date</th>
            <th className="px-4 py-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {productList?.map((product) => (
            <tr key={product?.id}>
              <td className="px-2 max-w-[200px] py-2 border">
                {product?.name}
                <br />
                {product?.id}
              </td>
              <td className="px-4 py-2 border">
                <div className="flex items-center justify-center">
                  <Image
                    src={product?.imageUrl[0]}
                    alt={`Product ${product?.id}`}
                    width={50}
                    height={50}
                  />
                </div>
              </td>
              <td className="px-4 py-2 border">
                {new Date(product?.createdAt).toLocaleDateString("en-GB")}
              </td>
              <td className="px-4 py-2 border">
                <div className="flex justify-center gap-2 items-center">
                  <Link
                    href={`/dashboard/edit-product/${product.id}`}
                    className="btn text-blue-500 cursor-pointer"
                  >
                    Edit
                  </Link>
                  <div>
                    <AiFillDelete
                      onClick={() => handleDeleteProduct(product?.id)}
                      className="text-red-500 text-2xl cursor-pointer hover:scale-110"
                    />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-center items-center mt-6">
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          shape="rounded"
          color="primary"
          variant="outlined"
        />
      </div>
    </div>
  );
};

export default AllProductsTable;
