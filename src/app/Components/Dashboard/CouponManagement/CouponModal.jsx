"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";

const CouponModal = ({ isOpen, onClose, onSubmit, coupon = null }) => {
  const [formData, setFormData] = useState({
    couponName: "",
    couponType: "PERCENTAGE",
    minAmount: "",
    offerAmount: "",
    limit: "",
    validity: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (coupon) {
      setFormData({
        couponName: coupon.couponName || "",
        couponType: coupon.couponType || "PERCENTAGE",
        minAmount: coupon.minAmount || "",
        offerAmount: coupon.offerAmount || "",
        limit: coupon.limit || "",
        validity: coupon.validity ?? true,
      });
    } else {
      setFormData({
        couponName: "",
        couponType: "PERCENTAGE",
        minAmount: "",
        offerAmount: "",
        limit: "",
        validity: true,
      });
    }
  }, [coupon, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate fields
    if (!formData.couponName.trim()) {
      toast.error("Coupon Name is required");
      return;
    }

    if (formData.minAmount === "" || parseFloat(formData.minAmount) < 0) {
      toast.error("Min Amount must be a valid positive number or 0");
      return;
    }

    if (!formData.offerAmount || parseFloat(formData.offerAmount) <= 0) {
      toast.error("Offer Amount must be a valid positive number");
      return;
    }

    if (
      formData.couponType === "PERCENTAGE" &&
      parseFloat(formData.offerAmount) > 100
    ) {
      toast.error("Percentage cannot be more than 100%");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      setFormData({
        couponName: "",
        couponType: "PERCENTAGE",
        minAmount: "",
        offerAmount: "",
        limit: "",
        validity: true,
      });
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {coupon ? "Edit Coupon" : "Add New Coupon"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Coupon Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coupon Name
            </label>
            <input
              type="text"
              name="couponName"
              value={formData.couponName}
              onChange={handleChange}
              placeholder="e.g., SUMMER20"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Coupon Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Coupon Type
            </label>
            <select
              name="couponType"
              value={formData.couponType}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FLAT">Flat Amount</option>
            </select>
          </div>

          {/* Offer Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Offer Amount{" "}
              {formData.couponType === "PERCENTAGE" ? "(%)" : "(Flat)"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="offerAmount"
                value={formData.offerAmount}
                onChange={handleChange}
                placeholder={
                  formData.couponType === "PERCENTAGE"
                    ? "e.g., 10"
                    : "e.g., 100"
                }
                step="0.01"
                min="0"
                max={formData.couponType === "PERCENTAGE" ? "100" : undefined}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-600 min-w-fit">
                {formData.couponType === "PERCENTAGE" ? "%" : "TK"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.couponType === "PERCENTAGE"
                ? "Discount percentage (0-100)"
                : "Flat discount amount"}
            </p>
          </div>

          {/* Min Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Amount
            </label>
            <input
              type="number"
              name="minAmount"
              value={formData.minAmount}
              onChange={handleChange}
              placeholder="e.g., 500"
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum bill amount to activate this coupon
            </p>
          </div>

          {/* Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usage Limit
            </label>
            <input
              type="number"
              name="limit"
              value={formData.limit}
              onChange={handleChange}
              placeholder="e.g., 50"
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of times this coupon can be used
            </p>
          </div>

          {/* Validity */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="validity"
              name="validity"
              checked={formData.validity}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="validity"
              className="ml-3 text-sm font-medium text-gray-700"
            >
              Active (Turn on/off this coupon)
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {loading ? "Saving..." : coupon ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CouponModal;
