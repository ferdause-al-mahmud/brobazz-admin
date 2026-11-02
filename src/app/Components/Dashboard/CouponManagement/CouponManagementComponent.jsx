"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import CouponModal from "./CouponModal";
import CouponTable from "./CouponTable";

const CouponManagement = () => {
  const [coupons, setCoupons] = useState([]);
  const [filteredCoupons, setFilteredCoupons] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch coupons
  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/coupon");
      const data = await response.json();

      if (data.success) {
        setCoupons(data.data || []);
        setFilteredCoupons(data.data || []);
      } else {
        toast.error(data.message || "Failed to fetch coupons");
      }
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast.error("Error fetching coupons");
    } finally {
      setLoading(false);
    }
  };

  // Fetch coupons on component mount
  useEffect(() => {
    fetchCoupons();
  }, []);

  // Filter coupons based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCoupons(coupons);
    } else {
      const filtered = coupons.filter((coupon) =>
        coupon.couponName.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredCoupons(filtered);
    }
  }, [searchQuery, coupons]);

  // Handle modal open for adding
  const handleAddCoupon = () => {
    setSelectedCoupon(null);
    setIsModalOpen(true);
  };

  // Handle modal open for editing
  const handleEditCoupon = (coupon) => {
    setSelectedCoupon(coupon);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCoupon(null);
  };

  // Handle form submission
  const handleFormSubmit = async (formData) => {
    try {
      const url = "/api/coupon";
      const method = selectedCoupon ? "PUT" : "POST";
      const body = selectedCoupon
        ? { ...formData, _id: selectedCoupon._id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        handleModalClose();
        fetchCoupons(); // Refresh the list
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form");
    }
  };

  // Handle delete
  const handleDeleteCoupon = async (couponId) => {
    try {
      const response = await fetch("/api/coupon", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: couponId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        fetchCoupons(); // Refresh the list
      } else {
        toast.error(data.message || "Failed to delete coupon");
      }
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Error deleting coupon");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Coupon Management
        </h1>
        <p className="text-gray-600">
          Manage, create, and edit coupons for your customers
        </p>
      </div>

      {/* Controls Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search coupons by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Add Button */}
          <button
            onClick={handleAddCoupon}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition whitespace-nowrap"
          >
            <Plus size={20} />
            Add Coupon
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-gray-600 text-sm font-medium">Total Coupons</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {coupons.length}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-gray-600 text-sm font-medium">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {coupons.filter((c) => c.validity).length}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-gray-600 text-sm font-medium">Inactive</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {coupons.filter((c) => !c.validity).length}
            </p>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <CouponTable
        coupons={filteredCoupons}
        onEdit={handleEditCoupon}
        onDelete={handleDeleteCoupon}
        loading={loading}
      />

      {/* Modal */}
      <CouponModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleFormSubmit}
        coupon={selectedCoupon}
      />
    </div>
  );
};

export default CouponManagement;
