import React, { useState, useEffect } from "react";
import {
  Search,
  Package,
  DollarSign,
  ShoppingCart,
  Box,
  TrendingUp,
  Calendar,
} from "lucide-react";

const ProductRevDetails = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
        search: searchTerm,
      });

      if (startDate) {
        params.append("startDate", startDate);
      }
      if (endDate) {
        params.append("endDate", endDate);
      }

      const response = await fetch(`/api/admin/revenue-details?${params}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.products);
        setStats(data.stats || {});
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchTerm, startDate, endDate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat("bn-BD").format(number);
  };

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Product Revenue (Delivered Orders)
          </h1>
          <p className="text-gray-600 text-lg">
            Track product performance by delivery date
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Products
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stats.totalProducts || 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Box className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Qty Sold</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stats.totalQuantitySold || 0)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Revenue</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats.totalRevenue || 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Cost</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats.totalCost || 0)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <ShoppingCart className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Profit</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalGrossProfit || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.averageProfitMargin?.toFixed(1) || 0}% margin
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Date Filter Bar */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-3 focus:ring-blue-200 focus:border-blue-500 transition-all"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Start Date */}
            <div className="relative">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                From Date
              </label>
              <Calendar className="absolute left-4 top-9 text-gray-400 h-5 w-5" />
              <input
                type="date"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-3 focus:ring-blue-200 focus:border-blue-500 transition-all"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                To Date
              </label>
              <Calendar className="absolute left-4 top-9 text-gray-400 h-5 w-5" />
              <input
                type="date"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-3 focus:ring-blue-200 focus:border-blue-500 transition-all"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Clear Button */}
            <button
              onClick={clearDateFilter}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-all"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase">
                    Selling Price
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase">
                    Buying Price
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase">
                    Qty Sold
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase">
                    Revenue
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase">
                    Cost
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase">
                    Profit
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase">
                    Margin %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-gray-500">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.id}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600 text-right">
                        {formatCurrency(product.sellingPrice)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-orange-600 text-right">
                        {formatCurrency(product.buyingPrice)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        {formatNumber(product.totalQuantity)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-purple-600 text-right">
                        {formatCurrency(product.totalRevenue)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-600 text-right">
                        {formatCurrency(product.totalCost)}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm font-medium text-right ${
                          product.grossProfit >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(product.grossProfit)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        {product.profitMargin?.toFixed(1) || 0}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-100"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductRevDetails;
