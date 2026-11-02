"use client";

import React from "react";
import { AiFillDelete, AiFillEdit } from "react-icons/ai";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";

const CouponTable = ({ coupons, onEdit, onDelete, loading }) => {
  const handleDeleteClick = (coupon) => {
    confirmAlert({
      title: "Delete Coupon",
      message: `Are you sure you want to delete "${coupon.couponName}"?`,
      buttons: [
        {
          label: "Yes",
          onClick: async () => {
            await onDelete(coupon._id);
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
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!coupons || coupons.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">
          No coupons found. Create one to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Coupon Name
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Type
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Offer
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Min Amount
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Usage Limit
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Status
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Created Date
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((coupon) => (
            <tr
              key={coupon._id}
              className="border-b hover:bg-gray-50 transition"
            >
              <td className="px-6 py-4">
                <span className="font-medium text-gray-900">
                  {coupon.couponName}
                  <br />
                  <span
                    className={`text-xs ${coupon.isRedeemedCoupon ? "text-red-500" : "text-green-500"} `}
                  >
                    {coupon.isRedeemedCoupon
                      ? "Redeemed Coupon"
                      : "Regular Coupon"}
                  </span>
                  <br />
                  <span className={`text-sm ${"text-black"} `}>
                    {coupon.redeemedByEmail
                      ? `Redeemed by: ${coupon.redeemedByEmail}`
                      : ""}
                  </span>
                </span>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm uppercase font-medium ${
                    coupon.couponType === "PERCENTAGE"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {coupon.couponType === "PERCENTAGE" ? "Percent %" : "Flat"}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="font-semibold text-gray-900">
                  {coupon.couponType === "PERCENTAGE"
                    ? `${parseFloat(coupon.offerAmount).toFixed(1)}%`
                    : `TK ${parseFloat(coupon.offerAmount).toFixed(2)}`}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-900">
                TK {parseFloat(coupon.minAmount).toFixed(2)}
              </td>
              <td className="px-6 py-4 text-gray-900">
                <span className="font-medium">{coupon.limit || 0}</span> times
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    coupon.validity
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {coupon.validity ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-600">
                {new Date(coupon.createdAt).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-center items-center gap-3">
                  <button
                    onClick={() => onEdit(coupon)}
                    className="text-blue-600 hover:text-blue-800 hover:scale-110 transition-transform"
                    title="Edit coupon"
                  >
                    <AiFillEdit size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(coupon)}
                    className="text-red-600 hover:text-red-800 hover:scale-110 transition-transform"
                    title="Delete coupon"
                  >
                    <AiFillDelete size={20} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CouponTable;
