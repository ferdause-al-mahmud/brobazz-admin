"use client";
import React, { useState } from "react";
import {
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Check,
  X,
  Trash2,
  Eye,
  Star,
  Calendar,
  Mail,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";

const ReviewsTable = ({ reviews: initialReviews }) => {
  const [reviews, setReviews] = useState(initialReviews || []);
  const [isLoading, setIsLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/reviews`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch reviews");
      }
      const data = await response.json();
      setReviews(data);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to fetch reviews");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (review) => {
    try {
      const response = await fetch(`/api/reviews/${review._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "approved" }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve review");
      }

      toast.success("Review approved successfully");
      fetchReviews();
    } catch (error) {
      console.error("Error approving review:", error);
      toast.error("Failed to approve review");
    }
  };

  const handleDisapprove = async (review) => {
    try {
      const response = await fetch(`/api/reviews/${review._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "rejected" }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject review");
      }

      toast.success("Review rejected successfully");
      fetchReviews();
    } catch (error) {
      console.error("Error rejecting review:", error);
      toast.error("Failed to reject review");
    }
  };

  const handleDelete = (review) => {
    confirmAlert({
      title: "Delete Review",
      message: "Are you sure you want to delete this review?",
      buttons: [
        {
          label: "Yes, Delete",
          onClick: async () => {
            try {
              const response = await fetch(`/api/reviews/${review._id}`, {
                method: "DELETE",
              });

              if (!response.ok) {
                throw new Error("Failed to delete review");
              }

              toast.success("Review deleted successfully");
              fetchReviews();
            } catch (error) {
              console.error("Error deleting review:", error);
              toast.error("Failed to delete review");
            }
          },
        },
        {
          label: "Cancel",
          onClick: () => {},
        },
      ],
    });
  };

  const handleViewDetails = (review) => {
    setSelectedReview(review);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedReview(null);
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-semibold ${
          statusColors[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (reviews.length === 0) {
    return (
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <p className="text-gray-500 text-lg">No reviews found</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex justify-between items-center p-4 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reviews Management
          </h1>
          <p className="text-gray-600">
            Total Reviews:{" "}
            <span className="font-semibold">{reviews.length}</span>
          </p>
        </div>
        <button
          onClick={fetchReviews}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
        >
          <span>Refresh</span>
        </button>
      </div>

      <TableContainer component={Paper} className="shadow-lg">
        <Table stickyHeader>
          <TableHead>
            <TableRow style={{ backgroundColor: "#f3f4f6" }}>
              <TableCell style={{ fontWeight: "bold" }}>Customer</TableCell>
              <TableCell style={{ fontWeight: "bold" }}>Email</TableCell>
              <TableCell style={{ fontWeight: "bold" }}>Rating</TableCell>
              <TableCell style={{ fontWeight: "bold" }}>Review</TableCell>
              <TableCell style={{ fontWeight: "bold" }}>Status</TableCell>
              <TableCell style={{ fontWeight: "bold" }}>Date</TableCell>
              <TableCell style={{ fontWeight: "bold" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reviews.map((review) => (
              <TableRow
                key={review._id}
                hover
                className="hover:bg-gray-50 transition-colors"
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-gray-500" />
                    {review.name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-500" />
                    {review.email}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={
                          i < review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }
                      />
                    ))}
                    <span className="ml-2 font-semibold">
                      {review.rating}/5
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate text-gray-700">
                    {review.review}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(review.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={14} />
                    {formatDate(review.createdAt)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(review)}
                      title="View Details"
                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded transition-colors"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleApprove(review)}
                      disabled={review.status === "approved"}
                      title="Approve"
                      className="p-2 bg-green-100 hover:bg-green-200 text-green-600 disabled:bg-gray-100 disabled:text-gray-400 rounded transition-colors"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => handleDisapprove(review)}
                      disabled={review.status === "rejected"}
                      title="Reject"
                      className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 disabled:bg-gray-100 disabled:text-gray-400 rounded transition-colors"
                    >
                      <X size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(review)}
                      title="Delete"
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Details Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="font-bold text-lg">Review Details</DialogTitle>
        {selectedReview && (
          <DialogContent>
            <div className="space-y-4 mt-4">
              <div>
                <label className="font-semibold text-gray-700">
                  Customer Name
                </label>
                <p className="text-gray-900">{selectedReview.name}</p>
              </div>
              <div>
                <label className="font-semibold text-gray-700">Email</label>
                <p className="text-gray-900">{selectedReview.email}</p>
              </div>
              <div>
                <label className="font-semibold text-gray-700">Rating</label>
                <div className="flex items-center gap-2 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={
                        i < selectedReview.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }
                    />
                  ))}
                  <span className="ml-2 font-semibold">
                    {selectedReview.rating}/5
                  </span>
                </div>
              </div>
              <div>
                <label className="font-semibold text-gray-700">Review</label>
                <p className="text-gray-900 p-3 bg-gray-50 rounded mt-1">
                  {selectedReview.review}
                </p>
              </div>
              <div>
                <label className="font-semibold text-gray-700">Status</label>
                <p className="mt-1">{getStatusBadge(selectedReview.status)}</p>
              </div>
              <div>
                <label className="font-semibold text-gray-700">
                  Submitted Date
                </label>
                <p className="text-gray-900">
                  {formatDate(selectedReview.createdAt)}
                </p>
              </div>
            </div>
          </DialogContent>
        )}
        <DialogActions>
          <button
            onClick={handleCloseDialog}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            Close
          </button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReviewsTable;
