"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

const OrderConfirmation = ({ params }) => {
  const [orderDetails, setOrderDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await axios.get(`/api/orders/${params?.id}`);
        setOrderDetails(response.data);
      } catch (error) {
        console.error("Error fetching order details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [params.id]);
  const subtotal = orderDetails?.cart?.reduce((total, item) => {
    const priceToUse = item?.offerPrice ? item.offerPrice : item?.price;
    return total + priceToUse * item?.quantity;
  }, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-blue-500 border-opacity-75"></div>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className=" flex-col gap-4 flex justify-center items-center h-[80vh] ">
        <div className="text-3xl sm:text-5xl font-semibold">
          Failed to load order details.
        </div>
        <div>
          <Link className="btn text-2xl bg-black text-white" href={"/"}>
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="text-center bg-green-100 text-green-700 font-semibold py-4 rounded-md mb-6">
        Thank you. Your order has been received.
      </div>

      <div className="bg-gray-100 !text-black p-4 rounded-md mb-6">
        <div className="flex justify-between mb-2">
          <span>Order number:</span>
          <span>{orderDetails.orderID}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Date:</span>
          <span>{new Date(orderDetails.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Total:</span>
          <span>{orderDetails.total}৳</span>
        </div>
        <div className="flex justify-between">
          <span>Payment method:</span>
          <span>
            {orderDetails.paymentOption === "cash"
              ? "Cash on delivery"
              : orderDetails.paymentOption}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-bold text-xl border-b pb-2 mb-4">ORDER DETAILS</h2>
        <div className="space-y-4 text-[18px] text-black">
          {orderDetails.cart.map((item, index) => (
            <div
              key={index}
              className="flex justify-between border-b pb-4 mb-4"
            >
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-sm sm:text-lg">ID: {item.id}</div>
                <div className="text-sm sm:text-lg">
                  Size: {item.selectedSize}
                </div>
                <div className="text-sm sm:text-lg">
                  Quantity: {item.quantity}
                </div>
              </div>
              <div className="text-right font-medium text-red-600">
                {item?.offerPrice
                  ? item?.offerPrice
                  : item?.price * item?.quantity}
                ৳
              </div>
            </div>
          ))}
        </div>

        <div className="sm:text-xl flex justify-between mt-4">
          <span>Subtotal:</span>
          <span>{subtotal}৳</span>
        </div>

        {orderDetails.discount > 0 && (
          <div className="sm:text-xl flex justify-between text-green-600">
            <span>Discount:</span>
            <span>-{orderDetails.discount}৳</span>
          </div>
        )}

        <div className="sm:text-xl flex justify-between">
          <span>Shipping:</span>
          <span>{orderDetails.shippingCost}৳</span>
        </div>
        <div className="text-lg sm:text-xl flex justify-between mt-2 font-bold border-t pt-2">
          <span>Total:</span>
          <span>{orderDetails.total}৳</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between">
        <div className="w-full md:w-1/2 md:pr-2 mb-6">
          <h3 className="font-bold text-xl mb-2">BILLING ADDRESS</h3>
          <div>{orderDetails.formData?.name}</div>
          <div>{orderDetails.formData?.address}</div>
          <div>{orderDetails.formData?.city}</div>
          <div>{orderDetails.formData?.phone}</div>
          <div>{orderDetails.formData?.email}</div>
          {orderDetails?.formData?.notes && (
            <>
              <h3 className="font-bold text-xl mt-2">Notes</h3>
              <p className="font-medium">{orderDetails?.formData?.notes}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
