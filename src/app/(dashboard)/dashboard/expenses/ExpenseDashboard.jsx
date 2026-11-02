"use client";
import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  X,
  Save,
} from "lucide-react";
import { Download as DownloadIcon } from "lucide-react";

import toast from "react-hot-toast";

const ExpenseDashboard = () => {
  const [payments, setPayments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    paymentId: null,
  });

  const [filters, setFilters] = useState({
    type: "all",
    category: "",
    startDate: "",
    endDate: "",
    employeeId: "",
    page: 1,
    limit: 10,
  });
  const [summary, setSummary] = useState({
    totalAmount: 0,
    salaryTotal: 0,
    expenseTotal: 0,
  });
  const [pagination, setPagination] = useState({
    totalPayments: 0,
    totalPages: 0,
    currentPage: 1,
  });

  // Form state
  const [formData, setFormData] = useState({
    type: "salary",
    employeeId: "",
    employeeName: "",
    category: "",
    amount: "",
    description: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "bank",
    status: "paid",
  });

  // Categories for different payment types
  const salaryCategories = ["salary", "bonus", "overtime", "allowance"];
  const expenseCategories = [
    "office-rent",
    "utilities",
    "marketing",
    "supplies",
    "maintenance",
    "travel",
    "other",
  ];

  // Fetch payments
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
      });

      if (filters.type !== "all") params.append("type", filters.type);
      if (filters.category) params.append("category", filters.category);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.employeeId) params.append("employeeId", filters.employeeId);

      const response = await fetch(`/api/admin/payments?${params}`);
      const data = await response.json();

      if (data.success) {
        setPayments(data.payments);
        setSummary(data.summary);
        setPagination(data.pagination);
      }
    } catch (error) {
      toast.error("Failed to fetch payments");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/admin/employees");
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingPayment
        ? `/api/admin/payments/${editingPayment._id}`
        : "/api/admin/payments";

      const method = editingPayment ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          editingPayment
            ? "Payment updated successfully"
            : "Payment created successfully"
        );
        setShowModal(false);
        resetForm();
        fetchPayments();
      } else {
        toast.error(data.error || "Failed to save payment");
      }
    } catch (error) {
      toast.error("Failed to save payment");
      console.error("Error:", error);
    }
  };

  // Delete payment
  const handleDelete = async (id) => {
    try {
      const response = await fetch(`/api/admin/payments/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Payment deleted successfully");
        fetchPayments();
      } else {
        toast.error(data.error || "Failed to delete payment");
      }
    } catch (error) {
      toast.error("Failed to delete payment");
      console.error("Error:", error);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      type: "salary",
      employeeId: "",
      employeeName: "",
      category: "",
      amount: "",
      description: "",
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "bank",
      status: "paid",
    });
    setEditingPayment(null);
  };

  // Handle edit
  const handleEdit = (payment) => {
    setFormData({
      type: payment.type,
      employeeId: payment.employeeId || "",
      employeeName: payment.employeeName || "",
      category: payment.category,
      amount: payment.amount.toString(),
      description: payment.description || "",
      paymentDate: payment.paymentDate
        ? new Date(payment.paymentDate).toISOString().split("T")[0]
        : "",
      paymentMethod: payment.paymentMethod || "bank",
      status: payment.status || "paid",
    });
    setEditingPayment(payment);
    setShowModal(true);
  };

  // Handle employee selection
  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find((emp) => emp._id === employeeId);
    setFormData((prev) => ({
      ...prev,
      employeeId,
      employeeName: employee ? employee.name : "",
      amount: employee ? employee.salary.toString() : prev.amount,
    }));
  };

  //download csv
  const exportAllToCSV = async () => {
    try {
      const params = new URLSearchParams();

      if (filters.type !== "all") params.append("type", filters.type);
      if (filters.category) params.append("category", filters.category);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.employeeId) params.append("employeeId", filters.employeeId);

      params.append("all", "true"); // <- This tells backend to return all records

      const response = await fetch(`/api/admin/payments?${params}`);
      const data = await response.json();

      if (!data.success || !data.payments) {
        toast.error("Failed to fetch payments for export");
        return;
      }

      const headers = [
        "Date",
        "Type",
        "Employee/Category",
        "Amount",
        "Status",
        "Description",
      ];

      const rows = data.payments.map((p) => [
        new Date(p.paymentDate).toLocaleDateString(),
        p.type === "salary" ? "Salary" : "Expense",
        p.type === "salary" ? p.employeeName : p.category,
        p.amount,
        p.status.charAt(0).toUpperCase() + p.status.slice(1),
        (p.description || "").replace(/(\r\n|\n|\r)/gm, " "),
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "payments_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Exported payments to CSV");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export payments");
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [filters]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Management
          </h1>
          <p className="text-gray-600">
            Manage employee salaries and business expenses
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Total Payments
                </h3>
                <p className="text-2xl font-bold text-blue-600">
                  ৳{summary.totalAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Salary Payments
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  ৳{summary.salaryTotal.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Expenses
                </h3>
                <p className="text-2xl font-bold text-orange-600">
                  ৳{summary.expenseTotal.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Total Records
                </h3>
                <p className="text-2xl font-bold text-purple-600">
                  {pagination.totalPayments}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Add Payment Button */}
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </button>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 flex-1">
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    type: e.target.value,
                    page: 1,
                  }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="salary">Salary</option>
                <option value="expense">Expense</option>
              </select>

              <select
                value={filters.employeeId}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    employeeId: e.target.value,
                    page: 1,
                  }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Employees</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                    page: 1,
                  }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                    page: 1,
                  }))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              <button
                onClick={() =>
                  setFilters({
                    type: "all",
                    category: "",
                    startDate: "",
                    endDate: "",
                    employeeId: "",
                    page: 1,
                    limit: 10,
                  })
                }
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
              <button
                onClick={exportAllToCSV}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Export All to CSV
              </button>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee/Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading payments...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No payments found
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.type === "salary"
                              ? "bg-green-100 text-green-800"
                              : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {payment.type === "salary" ? "Salary" : "Expense"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.type === "salary"
                          ? payment.employeeName
                          : payment.category}
                        {payment.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {payment.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ৳{payment.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : payment.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {payment.status.charAt(0).toUpperCase() +
                            payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(payment)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmDelete({
                                open: true,
                                paymentId: payment._id,
                              })
                            }
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {(pagination.currentPage - 1) * filters.limit + 1} to{" "}
                {Math.min(
                  pagination.currentPage * filters.limit,
                  pagination.totalPayments
                )}{" "}
                of {pagination.totalPayments} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, page: i + 1 }))
                    }
                    className={`px-3 py-1 text-sm rounded-md ${
                      pagination.currentPage === i + 1
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: Math.min(pagination.totalPages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingPayment ? "Edit Payment" : "Add New Payment"}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Payment Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          type: e.target.value,
                          category: "",
                          employeeId: "",
                          employeeName: "",
                          amount: "",
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="salary">Salary</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>

                  {/* Employee Selection (for salary) */}
                  {formData.type === "salary" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee
                      </label>
                      <select
                        value={formData.employeeId}
                        onChange={(e) => handleEmployeeSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Employee</option>
                        {employees.map((employee) => (
                          <option key={employee._id} value={employee._id}>
                            {employee.name} - {employee.position}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Category</option>
                      {(formData.type === "salary"
                        ? salaryCategories
                        : expenseCategories
                      ).map((category) => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() +
                            category.slice(1).replace("-", " ")}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (৳)
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter amount"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paymentDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paymentMethod: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="bank">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter additional notes or description"
                      rows="3"
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingPayment ? "Update Payment" : "Save Payment"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {confirmDelete.open && (
          <dialog id="delete_modal" className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg text-red-600">
                Confirm Deletion
              </h3>
              <p className="py-4">
                Are you sure you want to delete this payment? This action cannot
                be undone.
              </p>
              <div className="modal-action">
                <button
                  className="btn bg-gray-200 text-gray-800"
                  onClick={() =>
                    setConfirmDelete({ open: false, paymentId: null })
                  }
                >
                  Cancel
                </button>
                <button
                  className="btn bg-red-600 text-white hover:bg-red-700"
                  onClick={() => {
                    handleDelete(confirmDelete.paymentId);
                    setConfirmDelete({ open: false, paymentId: null });
                  }}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </dialog>
        )}
      </div>
    </div>
  );
};

export default ExpenseDashboard;
