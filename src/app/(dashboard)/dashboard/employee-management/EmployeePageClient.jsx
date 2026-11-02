"use client";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Download,
  Pencil,
  Trash2,
  Search,
  Plus,
  X,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Confirmation Modal Component
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "danger",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center mb-4">
          <div
            className={`p-2 rounded-full mr-3 ${
              type === "danger"
                ? "bg-red-100 text-red-600"
                : "bg-blue-100 text-blue-600"
            }`}
          >
            {type === "danger" ? (
              <Trash2 className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg transition-colors ${
              type === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {type === "danger" ? "Delete" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {getPageNumbers().map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 rounded-lg border ${
            currentPage === page
              ? "bg-blue-600 text-white border-blue-600"
              : "hover:bg-gray-50"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function EmployeePageClient() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    employee: null,
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    name: "",
    position: "",
    salary: "",
    phone: "",
    email: "",
    joinDate: "",
    status: "active",
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  const fetchEmployees = async (page = 1, searchQuery = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        search: searchQuery,
        status: "all",
      });

      const res = await fetch(`/api/admin/employees?${params}`);
      const data = await res.json();

      if (data.success) {
        setEmployees(data.employees);
        setTotalPages(data.totalPages);
        setTotalEmployees(data.total);
        setStats(data.stats || { total: 0, active: 0, inactive: 0 });
      } else {
        toast.error("Failed to fetch employees");
      }
    } catch (error) {
      toast.error("Network error occurred");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees(currentPage, search);
  }, [currentPage]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchEmployees(1, search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const url = "/api/admin/employees";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing ? { ...formData, _id: editing } : formData
        ),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          editing
            ? "Employee updated successfully"
            : "Employee created successfully"
        );
        fetchEmployees(currentPage, search);
        resetForm();
      } else {
        toast.error(data.error || "Operation failed");
      }
    } catch (error) {
      toast.error("Network error occurred");
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      position: "",
      salary: "",
      phone: "",
      email: "",
      joinDate: "",
      status: "active",
    });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (emp) => {
    setEditing(emp._id);
    setFormData({
      name: emp.name,
      position: emp.position,
      salary: emp.salary,
      phone: emp.phone,
      email: emp.email,
      joinDate: emp.joinDate?.slice(0, 10),
      status: emp.status,
    });
    setShowForm(true);
  };

  const handleDeleteConfirm = (employee) => {
    setConfirmModal({
      isOpen: true,
      employee,
    });
  };

  const handleDelete = async () => {
    const { employee } = confirmModal;
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/employees?id=${employee._id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Employee deleted successfully");
        fetchEmployees(currentPage, search);
      } else {
        toast.error("Failed to delete employee");
      }
    } catch (error) {
      toast.error("Network error occurred");
    }

    setConfirmModal({ isOpen: false, employee: null });
    setLoading(false);
  };

  const exportCSV = async () => {
    try {
      const res = await fetch("/api/admin/employees/export");
      const data = await res.json();

      if (data.success) {
        const header = [
          "Name",
          "Position",
          "Salary",
          "Phone",
          "Email",
          "Join Date",
          "Status",
          "Created At",
        ];

        const rows = data.employees.map((e) => [
          e.name,
          e.position,
          e.salary,
          e.phone || "",
          e.email || "",
          e.joinDate ? new Date(e.joinDate).toLocaleDateString() : "",
          e.status,
          new Date(e.createdAt).toLocaleDateString(),
        ]);

        const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `employees_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success("CSV exported successfully");
      } else {
        toast.error("Failed to export data");
      }
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Employee Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your team members and their information
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Employee
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Employees
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <User className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.active}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
                <User className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Inactive
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.inactive}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          {showForm && (
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editing ? "Edit Employee" : "Add New Employee"}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {[
                    "name",
                    "position",
                    "salary",
                    "phone",
                    "email",
                    "joinDate",
                  ].map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                        {["name", "position", "salary"].includes(field) && (
                          <span className="text-red-500">*</span>
                        )}
                      </label>
                      <input
                        type={
                          field === "joinDate"
                            ? "date"
                            : field === "salary"
                            ? "number"
                            : field === "email"
                            ? "email"
                            : "text"
                        }
                        name={field}
                        value={formData[field] || ""}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        required={["name", "position", "salary"].includes(
                          field
                        )}
                        min={field === "salary" ? "0" : undefined}
                        step={field === "salary" ? "0.01" : undefined}
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? "Processing..."
                      : editing
                      ? "Update Employee"
                      : "Add Employee"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table Section */}
          <div className={`${showForm ? "lg:col-span-2" : "lg:col-span-3"}`}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Employee List ({totalEmployees} total)
                </h3>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search employees..."
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white w-64"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Loading employees...
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                          <th className="px-6 py-3">Name</th>
                          <th className="px-6 py-3">Position</th>
                          <th className="px-6 py-3">Salary</th>
                          <th className="px-6 py-3">Phone</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp, index) => (
                          <tr
                            key={emp._id}
                            className={`border-b dark:border-gray-700 ${
                              index % 2 === 0
                                ? "bg-white dark:bg-gray-800"
                                : "bg-gray-50 dark:bg-gray-700"
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {emp.name}
                              </div>
                              {emp.email && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {emp.email}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-gray-900 dark:text-white">
                              {emp.position}
                            </td>
                            <td className="px-6 py-4 text-gray-900 dark:text-white">
                              {emp.salary?.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-gray-900 dark:text-white">
                              {emp.phone || "N/A"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  emp.status === "active"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {emp.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleEdit(emp)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                                  title="Edit Employee"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteConfirm(emp)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                                  title="Delete Employee"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {employees.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                        No employees found
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {search
                          ? "Try adjusting your search terms"
                          : "Get started by creating a new employee"}
                      </p>
                    </div>
                  )}

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, employee: null })}
          onConfirm={handleDelete}
          title="Delete Employee"
          message={`Are you sure you want to delete ${confirmModal.employee?.name}? This action cannot be undone.`}
          type="danger"
        />
      </div>
    </div>
  );
}
