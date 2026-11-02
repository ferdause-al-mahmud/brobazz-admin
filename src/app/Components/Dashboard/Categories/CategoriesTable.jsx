"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Link from "next/link";
import { AiFillDelete, AiFillEdit } from "react-icons/ai";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import { CircularProgress } from "@mui/material";

const CategoriesTable = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState(""); // Filter by type

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const query = typeFilter ? `?type=${typeFilter}` : "";
      const response = await axios.get(`/api/categories${query}`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [typeFilter]);

  const handleDelete = (categoryId) => {
    confirmAlert({
      title: "Confirm to Delete",
      message: "Are you sure you want to delete this category?",
      buttons: [
        {
          label: "Yes",
          onClick: async () => {
            try {
              await axios.delete(`/api/categories/${categoryId}`);
              toast.success("Category deleted successfully!");
              setCategories(categories.filter((cat) => cat._id !== categoryId));
            } catch (error) {
              console.error("Error deleting category:", error);
              toast.error("Failed to delete category");
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

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Categories</h1>
        <Link
          href="/dashboard/add-category"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Add Category
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <label className="text-black font-bold mr-3">Filter by Type:</label>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-400 bg-white text-black p-2 rounded"
        >
          <option value="">All Types</option>
          <option value="collection">Collections</option>
          <option value="accessories">Accessories</option>
        </select>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No categories found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border text-left">Type</th>
                <th className="px-4 py-2 border text-left">Category</th>
                <th className="px-4 py-2 border text-left">Subcategory</th>
                <th className="px-4 py-2 border text-left">Meta Title</th>
                <th className="px-4 py-2 border text-left">Created At</th>
                <th className="px-4 py-2 border text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {category.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 border font-medium">
                    {category.category}
                  </td>
                  <td className="px-4 py-2 border">
                    {category.subcategory || "-"}
                  </td>
                  <td className="px-4 py-2 border text-sm">
                    {category.metaTitle?.substring(0, 30)}...
                  </td>
                  <td className="px-4 py-2 border text-sm">
                    {new Date(category.createdAt).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-2 border">
                    <div className="flex justify-center gap-3">
                      <Link
                        href={`/dashboard/edit-category/${category._id}`}
                        className="text-blue-500 hover:text-blue-700 text-xl"
                      >
                        <AiFillEdit />
                      </Link>
                      <button
                        onClick={() => handleDelete(category._id)}
                        className="text-red-500 hover:text-red-700 text-xl"
                      >
                        <AiFillDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CategoriesTable;
