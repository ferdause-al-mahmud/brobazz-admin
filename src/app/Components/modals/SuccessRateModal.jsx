"use client";
import { useState } from "react";

const SuccessRateModal = ({ phoneNumber }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rateData, setRateData] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkSuccessRate = async (phone) => {
    setLoading(true);
    try {
      const response = await fetch("/api/pathao-success", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const result = await response.json();

      const showCount = result?.data?.show_count;
      const rating = result?.data?.customer_rating;
      const customer = result?.data?.customer;

      if (showCount && customer) {
        const delivered = customer?.successful_delivery || 0;
        const processed = customer?.total_delivery || 0;
        const successRate = processed > 0 ? (delivered / processed) * 100 : 0;

        setRateData({
          type: "count",
          successRate: successRate.toFixed(2),
          delivered,
          processed,
          returned: processed - delivered,
        });
      } else {
        setRateData({
          type: "rating",
          rating,
        });
      }

      setIsOpen(true);
    } catch (error) {
      console.error("Error checking success rate:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSuccessRateColor = (rate) => {
    const numericRate = Number(rate);
    if (numericRate >= 80) return "text-green-600";
    if (numericRate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressBarColor = (rate) => {
    const numericRate = Number(rate);
    if (numericRate >= 80) return "bg-green-500";
    if (numericRate >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getRatingLabel = (rating) => {
    if (rating === "excellent_customer") return "Excellent Customer";
    if (rating === "new_customer") return "New Customer";
    return rating?.replaceAll("_", " ");
  };

  const getRatingColor = (rating) => {
    if (rating === "excellent_customer") return "text-green-600";
    if (rating === "new_customer") return "text-blue-600";
    return "text-gray-600";
  };

  return (
    <div>
      {/* Button */}
      <button
        onClick={() => checkSuccessRate(phoneNumber)}
        disabled={loading}
        className="bg-gradient-to-r from-blue-500 to-blue-600 
        hover:from-blue-600 hover:to-blue-700 
        text-white w-full px-2 mt-2 py-1 rounded-lg font-medium
        shadow-lg hover:shadow-xl transition-all duration-200
        transform hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Checking...
          </>
        ) : (
          <>Pathao Success Rate</>
        )}
      </button>

      {/* Modal */}
      {isOpen && rateData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Customer Analysis</h2>
                  <p className="text-orange-100 text-sm mt-1">
                    Delivery performance overview
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:text-orange-200 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all duration-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* ========================= */}
              {/* COUNT MODE (show_count true) */}
              {/* ========================= */}
              {rateData.type === "count" && (
                <>
                  <div className="text-center mb-6">
                    <div
                      className={`text-6xl font-bold mb-2 ${getSuccessRateColor(
                        rateData.successRate,
                      )}`}
                    >
                      {rateData.successRate}%
                    </div>
                    <div className="text-gray-600 text-lg">Success Rate</div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Delivery Performance
                      </span>
                      <span
                        className={`text-sm font-bold ${getSuccessRateColor(
                          rateData.successRate,
                        )}`}
                      >
                        {rateData.successRate}%
                      </span>
                    </div>
                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`absolute top-0 left-0 h-3 ${getProgressBarColor(
                          rateData.successRate,
                        )} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: `${rateData.successRate}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {rateData.processed}
                      </div>
                      <div className="text-sm text-blue-800 font-medium">
                        Total Orders
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {rateData.delivered}
                      </div>
                      <div className="text-sm text-green-800 font-medium">
                        Delivered
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                      <div className="text-2xl font-bold text-red-600 mb-1">
                        {rateData.returned}
                      </div>
                      <div className="text-sm text-red-800 font-medium">
                        Returned
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ========================= */}
              {/* RATING MODE (show_count false) */}
              {/* ========================= */}
              {rateData.type === "rating" && (
                <div className="text-center py-10">
                  <div
                    className={`text-4xl font-bold mb-3 ${getRatingColor(
                      rateData.rating,
                    )}`}
                  >
                    {getRatingLabel(rateData.rating)}
                  </div>
                  <div className="text-gray-600 text-lg">Customer Rating</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuccessRateModal;
