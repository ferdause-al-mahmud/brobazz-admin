"use client";
import { useState } from "react";

const categoryLabels = {
  no_response: "No response",
  refused: "Refused delivery",
};

const volumeBandLabels = {
  none: "None (0)",
  low: "Low (1–5)",
  medium: "Medium (6–20)",
  high: "High (21–200)",
  very_high: "Very high (200+)",
};

const formatCategory = (category) =>
  categoryLabels[category] ||
  category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const FraudCheckModal = ({ phoneNumber }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkFraud = async () => {
    if (!phoneNumber) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/fraud-check?phone=${encodeURIComponent(phoneNumber)}`,
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Something went wrong");
      }

      setData({
        deliveryRatio: result.delivery_ratio,
        cancellationRatio: result.cancellation_ratio,
        volumeBand: result.volume_band,
        totalReports: result.total_reports,
        fraudCategories:
          result.fraud_categories &&
          typeof result.fraud_categories === "object" &&
          !Array.isArray(result.fraud_categories)
            ? Object.entries(result.fraud_categories)
            : [],
        doubtfulReports: result.doubtful_reports === true,
      });

      setIsOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatRatio = (ratio) =>
    ratio === null || ratio === undefined ? "—" : `${ratio}%`;

  const formatCount = (count) =>
    count === null || count === undefined ? "—" : count;

  const formatVolumeBand = (band) =>
    volumeBandLabels[band] ||
    (band
      ? band
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : "Unknown");

  const ratioBarWidth = (ratio) =>
    ratio === null || ratio === undefined
      ? "0%"
      : `${Math.min(100, Math.max(0, Number(ratio)))}%`;

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={checkFraud}
        disabled={loading}
        className="w-full mt-2 py-2 rounded-xl font-semibold text-white
        bg-gradient-to-r from-indigo-500 to-blue-600
        hover:from-indigo-600 hover:to-blue-700
        transition-all duration-200 shadow-lg p-1
        disabled:opacity-50"
      >
        {loading ? "Checking..." : "Delivery & Fraud Check"}
      </button>

      {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}

      {isOpen && data && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-2xl overflow-y-auto animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fraud-check-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
              <div className="flex justify-between items-center">
                <h2 id="fraud-check-title" className="text-xl font-bold">
                  Delivery & Report History
                </h2>
                <button
                  onClick={closeModal}
                  className="text-white text-xl"
                  aria-label="Close fraud check"
                >
                  ×
                </button>
              </div>
              <p className="text-sm opacity-90 mt-1">Phone: {phoneNumber}</p>
            </div>

            <div className="p-6 space-y-5">
              <section aria-labelledby="delivery-record-title">
                <h3
                  id="delivery-record-title"
                  className="font-semibold text-gray-900 mb-3"
                >
                  Completed delivery record
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-green-700">
                      {formatRatio(data.deliveryRatio)}
                    </div>
                    <div className="text-sm text-gray-700">
                      Delivered (including partial)
                    </div>
                    <div className="h-2 bg-green-100 rounded-full mt-3 overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: ratioBarWidth(data.deliveryRatio) }}
                      />
                    </div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-red-700">
                      {formatRatio(data.cancellationRatio)}
                    </div>
                    <div className="text-sm text-gray-700">Cancelled</div>
                    <div className="h-2 bg-red-100 rounded-full mt-3 overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: ratioBarWidth(data.cancellationRatio),
                        }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Based on this phone&apos;s shared history across merchants.
                  Percentages cover finished parcels only; partially delivered
                  parcels count as delivered and in-flight parcels are excluded.
                  Each figure is rounded down separately, so they may not add up
                  to 100%.
                </p>
                {(data.deliveryRatio === null ||
                  data.deliveryRatio === undefined) &&
                  (data.cancellationRatio === null ||
                    data.cancellationRatio === undefined) && (
                    <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mt-3">
                      No completed delivery history is available. This is
                      unknown, not a 0% delivery record.
                    </p>
                  )}
              </section>

              <section className="grid grid-cols-2 gap-3">
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500">
                    All-merchant volume
                  </div>
                  <div className="font-semibold text-gray-900 mt-1">
                    {formatVolumeBand(data.volumeBand)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Completed-parcel band; exact count is not shown.
                  </div>
                </div>
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500">Merchant reports</div>
                  <div className="font-semibold text-gray-900 mt-1">
                    {formatCount(data.totalReports)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Across merchants
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Report categories
                </h3>
                {data.fraudCategories.length > 0 ? (
                  <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl px-3">
                    {data.fraudCategories.map(([category, count]) => (
                      <li
                        key={category}
                        className="py-2 flex justify-between gap-3 text-sm"
                      >
                        <span className="text-gray-700">
                          {formatCategory(category)}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {count}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    No categorized reports are available. Some older reports may
                    not have a category, so this can be lower than the total
                    report count.
                  </p>
                )}
                {data.doubtfulReports && (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mt-2">
                    Some reports are marked as doubtful.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FraudCheckModal;
