"use client";
import {
  Box,
  Typography,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Button,
  Select,
  MenuItem,
  TextField,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { Pagination } from "@mui/material";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { FiEdit } from "react-icons/fi";
import toast from "react-hot-toast";
import Link from "next/link";
import { IoRefresh } from "react-icons/io5";
import { MdDeleteForever } from "react-icons/md";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import axios from "axios";
import EditOrderModal from "../../modals/EditOrderModal";
import { getParsedAddress } from "@/app/utils/getParsedAddress";
import SuccessRateModal from "../../modals/SuccessRateModal";

const OrdersTable = ({ orders, totalPages, currentPage }) => {
  const [orderStatuses, setOrderStatuses] = useState({});
  const cacheRef = useRef(new Map()); // id -> status

  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "";
  const [orderType, setOrderType] = useState(type);

  // Initialize date states from URL parameters
  const [startDate, setStartDate] = useState(
    searchParams.get("startDate")
      ? new Date(searchParams.get("startDate"))
      : null
  );
  const [endDate, setEndDate] = useState(
    searchParams.get("endDate") ? new Date(searchParams.get("endDate")) : null
  );

  const [page, setPage] = useState(currentPage || 1);
  const [updatedOrder, setUpdatedOrder] = useState({});
  const [disabledSave, setDisabledSave] = useState({});
  const [initialStatus, setInitialStatus] = useState({});
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [filteredOrders, setFilteredOrders] = useState(orders);
  const router = useRouter();
  const statusFilter = searchParams.get("status") || "all";
  const [products, setProducts] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");

  // Edit order modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [editFormData, setEditFormData] = useState({
    phone: "",
    notes: "",
    address: "",
    consignment_id: "",
    cart: [],
    total: 0,
    shippingCost: 0, // Added shipping cost field
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    confirmed: 0,
    exchange: 0,
    shipped: 0,
    delivered: 0,
    returned: 0,
  });

  //check pathao success rate

  // Fetch total counts from all-orders API
  const fetchTotalCounts = async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("type", orderType === "" ? "all" : orderType);

      // Add date filters to the counts query
      if (startDate) {
        queryParams.set("startDate", startDate);
      }
      if (endDate) {
        queryParams.set("endDate", endDate);
      }

      const response = await fetch(`/api/all-orders?${queryParams.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch counts");
      const data = await response.json();

      // Use the counts already calculated by the API
      let counts = {
        all: data.totalOrders,
        pending: data.pendingOrdersCount,
        exchange: data.exchangeOrdersCount,
        confirmed: data.confirmedOrdersCount,
        shipped: data.shippedOrdersCount,
        delivered: data.deliveredOrdersCount,
        returned: data.returnedOrdersCount,
      };

      // Adjust counts based on orderType filter
      if (orderType === "manual") {
        counts.pending = data.manualPendingOrdersCount;
        counts.exchange = data.manualExchangeOrdersCount;
        counts.confirmed = data.manualConfirmedOrdersCount;
        counts.shipped = data.manualShippedOrdersCount;
        counts.delivered = data.deliveredManualOrdersCount;
        counts.returned = data.manualReturnedOrdersCount;
      } else if (orderType === "web") {
        counts.pending = data.webPendingOrdersCount;
        counts.exchange = data.webExchangeOrdersCount;
        counts.confirmed = data.webConfirmedOrdersCount;
        counts.shipped = data.webShippedOrdersCount;
        counts.delivered = data.deliveredWebOrdersCount;
        counts.returned = data.webReturnedOrdersCount;
      }

      setStatusCounts(counts);
    } catch (error) {
      console.error("Error fetching order counts:", error);
    }
  };

  // Fetch counts on component mount and when orders change
  useEffect(() => {
    fetchTotalCounts();
  }, [orders]);

  useEffect(() => {
    const statusMap = {};
    const disabledMap = {};
    orders?.forEach((order) => {
      statusMap[order.orderID] = order.status;
      disabledMap[order.orderID] = true; // Initially, disable the Save button
    });
    setInitialStatus(statusMap);
    setDisabledSave(disabledMap);
  }, [orders]);

  // Filter orders based on search query when it changes
  useEffect(() => {
    if (orderSearchQuery) {
      setFilteredOrders(
        orders.filter((order) =>
          order?.formData?.phone
            ?.toLowerCase()
            .includes(orderSearchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredOrders(orders); // Reset to full list if no query
    }
  }, [orderSearchQuery, orders]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);

    const query = new URLSearchParams();
    query.set("page", newPage);
    query.set("status", statusFilter);

    if (orderType) {
      query.set("type", orderType);
    }

    // Preserve date filters when changing pages
    if (startDate) {
      query.set("startDate", startDate);
    }
    if (endDate) {
      query.set("endDate", endDate);
    }

    router.push(`/dashboard/all-orders?${query.toString()}`);
  };

  const handleStatusChange = (orderId, newStatus) => {
    setUpdatedOrder((prev) => ({ ...prev, [orderId]: newStatus }));
    setDisabledSave((prev) => ({
      ...prev,
      [orderId]: initialStatus[orderId] === newStatus,
    }));
  };

  const handleSave = async (orderId) => {
    try {
      const updatedStatus = updatedOrder[orderId];
      const originalStatus = initialStatus[orderId];

      if (updatedStatus && updatedStatus !== originalStatus) {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: updatedStatus }),
        });

        if (response.ok) {
          // Get the order details
          const orderDetails = orders.find(
            (order) => order.orderID === orderId
          );
          console.log(orderDetails?.formData?.address);
          if (updatedStatus === "confirmed") {
            const parsedAddress = await getParsedAddress(
              orderDetails?.formData?.address
            );

            if (!parsedAddress) {
              console.error("Failed to parse address");
              return;
            }

            const pathaoResponse = await fetch("/api/pathao-entry", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...orderDetails,
                parsedAddress, // pass this separately
              }),
            });
            const entryResponse = await pathaoResponse.json();

            if (pathaoResponse?.ok) {
              toast.success("Order entried in Pathao successfully!");
              const editResponse = await fetch(`/api/edit-order/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  consignment_id: entryResponse?.data?.consignment_id || "",
                }),
              });
              return;
            } else {
              toast.error("Failed to enter order in Pathao");
              return;
            }
          } else {
            toast.success("Order status updated successfully!");
          }

          // Handle inventory updates based on status changee
          if (updatedStatus === "returned" && originalStatus !== "returned") {
            // If order is being returned, add quantities back to inventory
            const quantityUpdates = orderDetails.cart?.map((item) => ({
              productId: item.id,
              size: item.selectedSize,
              quantity: Number.parseInt(item.quantity, 10), // Positive to add back to inventory
            }));

            await fetch("/api/orders/update-quantity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ updates: quantityUpdates }),
            });
          }

          setInitialStatus((prev) => ({ ...prev, [orderId]: updatedStatus }));
          setDisabledSave((prev) => ({ ...prev, [orderId]: true }));

          // Refresh the page data
          router.refresh();
        } else {
          toast.error("Failed to update order status");
        }
      }
    } catch (error) {
      toast.error("Error updating order status");
      console.error("Error:", error);
    }
  };

  const handleStatusFilter = (status) => {
    const query = new URLSearchParams();
    query.set("status", status);
    query.set("page", "1"); // Reset to first page when changing status

    if (orderType) {
      query.set("type", orderType);
    }

    // Preserve date filters when changing status
    if (startDate) {
      query.set("startDate", startDate);
    }
    if (endDate) {
      query.set("endDate", endDate);
    }

    router.push(`/dashboard/all-orders?${query.toString()}`);
    router.refresh();
  };

  const handleNumberSearch = (phone) => {
    const query = new URLSearchParams();
    query.set("page", "1"); // Reset to first page when changing type
    if (orderType) {
      query.set("type", orderType);
    }
    if (phone) {
      query.set("phone", phone);
    }

    router.push(`/dashboard/all-orders?${query.toString()}`);
  };

  const handleTypeFilter = (type) => {
    setOrderType(type);
    const query = new URLSearchParams();
    query.set("page", "1"); // Reset to first page when changing type
    setPhoneInput(""); // ✅ clear phone input

    if (type === "manual" || type === "web") {
      query.set("type", type);
    }

    // Preserve date filters when changing type
    if (startDate) {
      query.set("startDate", startDate);
    }
    if (endDate) {
      query.set("endDate", endDate);
    }

    router.push(`/dashboard/all-orders?${query.toString()}`);
  };

  const handleDateFilter = () => {
    const query = new URLSearchParams();

    // Add existing filters
    query.set("status", statusFilter);
    if (orderType) {
      query.set("type", orderType);
    }

    // Add date filters
    if (startDate) {
      query.set("startDate", startDate);
    }
    if (endDate) {
      query.set("endDate", endDate);
    }

    // Keep the current page when applying filters
    query.set("page", page);

    router.push(`/dashboard/all-orders?${query.toString()}`);
    router.refresh();
  };

  const clearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);

    const query = new URLSearchParams();
    query.set("status", statusFilter);
    if (orderType) {
      query.set("type", orderType);
    }
    // Keep the current page when clearing filters
    query.set("page", page);

    router.push(`/dashboard/all-orders?${query.toString()}`);
    router.refresh();
  };

  // Edit order functions
  const openEditModal = (order) => {
    setEditingOrder(order);
    setEditFormData({
      phone: order.formData?.phone || "",
      notes: order.formData?.notes || "",
      address: order.formData?.address || "",
      cart: [
        ...order.cart?.map((item) => ({
          ...item,
          quantity: Number.parseInt(item.quantity, 10),
          originalPrice: item.price,
        })),
      ],
      total: order.total,
      shippingCost: order.shippingCost || 0,
      consignment_id: order?.consignment_id,
    });
    setEditModalOpen(true);
    // Clear product search when opening modal
    setProductSearchQuery("");
    setProducts([]);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingOrder(null);
  };

  const handlePhoneChange = (e) => {
    setEditFormData({
      ...editFormData,
      phone: e.target.value,
    });
  };

  const handleNotesChange = (e) => {
    setEditFormData({
      ...editFormData,
      notes: e.target.value,
    });
  };
  const handleAddressChange = (e) => {
    setEditFormData({
      ...editFormData,
      address: e.target.value,
    });
  };

  const handleShippingCostChange = (value) => {
    const shippingCost = Number.parseInt(value, 10) || 0;

    // Recalculate total with new shipping cost
    const cartTotal = calculateTotal(editFormData.cart);
    const newTotal = cartTotal + shippingCost;

    setEditFormData({
      ...editFormData,
      shippingCost: shippingCost,
      total: newTotal,
    });
  };

  const handleConsignmentChange = (value) => {
    console.log(value);
    setEditFormData({
      ...editFormData,
      consignment_id: value,
    });
  };

  const handleTotalChange = (value) => {
    const totalV = Number.parseInt(value, 10) || 0;
    setEditFormData({
      ...editFormData,
      total: totalV,
    });
  };

  const handleItemQuantityChange = (index, value) => {
    const newCart = [...editFormData.cart];
    const newQuantity = Number.parseInt(value, 10) || 0;
    newCart[index].quantity = newQuantity;

    // Recalculate total
    const cartTotal = calculateTotal(newCart);
    const newTotal = cartTotal + editFormData.shippingCost;

    setEditFormData({
      ...editFormData,
      cart: newCart,
      total: newTotal,
    });
  };

  const handleItemSizeChange = (index, value) => {
    const newCart = [...editFormData.cart];
    newCart[index].selectedSize = value;

    setEditFormData({
      ...editFormData,
      cart: newCart,
    });
  };

  // Add function to handle price changes for individual items
  const handleItemPriceChange = (index, value) => {
    const newCart = [...editFormData.cart];
    const newPrice = Number.parseFloat(value) || 0;
    newCart[index].price = newPrice;

    // Recalculate total
    const cartTotal = calculateTotal(newCart);
    const newTotal = cartTotal + editFormData.shippingCost;

    setEditFormData({
      ...editFormData,
      cart: newCart,
      total: newTotal,
    });
  };

  const calculateTotal = (cart) => {
    return cart.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);
  };

  const handleProductSearch = useCallback(async () => {
    if (!productSearchQuery.trim()) return; // Prevent API call for empty queries

    try {
      const response = await axios.get(`/api/products`, {
        params: { name: productSearchQuery },
      });

      setProducts(response.data.orders || []); // Ensure correct data mapping
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }, [productSearchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (productSearchQuery.trim()) {
        handleProductSearch();
      } else {
        setProducts([]);
      }
      setIsTyping(false);
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [handleProductSearch, productSearchQuery]);

  const addProductToOrder = (product) => {
    // Use offerPrice if available, otherwise use regular price
    const productPrice = product.offerPrice || product.price;

    // Check if product already exists in cart
    const existingItemIndex = editFormData.cart.findIndex(
      (item) => item.id === product.id
    );

    if (existingItemIndex >= 0) {
      // If product exists, increase quantity
      const newCart = [...editFormData.cart];
      newCart[existingItemIndex].quantity += 1;

      // Recalculate total with shipping cost
      const cartTotal = calculateTotal(newCart);
      const newTotal = cartTotal + editFormData.shippingCost;

      setEditFormData({
        ...editFormData,
        cart: newCart,
        total: newTotal,
      });
    } else {
      // If product doesn't exist, add it to cart
      const newItem = {
        id: product.id,
        name: product.name,
        price: productPrice, // Use offerPrice if available
        imageUrl: product.imageUrl || [],
        selectedSize: "M", // Default size
        quantity: 1,
        originalPrice: product.price, // Store original price for reference
      };

      const newCart = [...editFormData.cart, newItem];

      // Recalculate total with shipping cost
      const cartTotal = calculateTotal(newCart);
      const newTotal = cartTotal + editFormData.shippingCost;

      setEditFormData({
        ...editFormData,
        cart: newCart,
        total: newTotal,
      });
    }

    // Clear search results
    setProductSearchQuery("");
    setProducts([]);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editingOrder) return;

    try {
      // Calculate inventory updates based on quantity and size changes
      const inventoryUpdates = [];

      // Get the original order items
      const originalItems = editingOrder.cart || [];

      // Compare original items with edited items
      originalItems.forEach((originalItem) => {
        const originalQuantity = Number.parseInt(originalItem.quantity, 10);
        const originalSize = originalItem.selectedSize;
        const productId = originalItem.id;

        // Find the corresponding item in the edited cart
        const editedItem = editFormData.cart.find(
          (item) => item.id === productId
        );

        if (editedItem) {
          // If the item still exists in the cart
          const newQuantity = editedItem.quantity;
          const newSize = editedItem.selectedSize;

          if (originalSize === newSize) {
            // Same size, just quantity change
            const quantityDiff = originalQuantity - newQuantity;
            if (quantityDiff !== 0) {
              inventoryUpdates.push({
                productId,
                size: originalSize,
                quantity: quantityDiff, // Positive adds to inventory, negative removes
              });
            }
          } else {
            // Size changed - need to add back to original size and remove from new size
            inventoryUpdates.push({
              productId,
              size: originalSize,
              quantity: originalQuantity, // Add back to original size
            });

            inventoryUpdates.push({
              productId,
              size: newSize,
              quantity: -newQuantity, // Remove from new size
            });
          }
        } else {
          // Item was removed from the cart
          inventoryUpdates.push({
            productId,
            size: originalSize,
            quantity: originalQuantity, // Add back to inventory
          });
        }
      });

      // Check for new items added to the cart
      editFormData.cart.forEach((editedItem) => {
        const productId = editedItem.id;
        const newQuantity = editedItem.quantity;
        const newSize = editedItem.selectedSize;

        // Check if this is a new item not in the original order
        const originalItem = originalItems.find(
          (item) => item.id === productId
        );
        if (!originalItem) {
          inventoryUpdates.push({
            productId,
            size: newSize,
            quantity: -newQuantity, // Remove from inventory
          });
        }
      });
      console.log(editFormData);
      // Update the order in the database
      const response = await fetch(`/api/edit-order/${editingOrder?.orderID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: editFormData.phone,
          notes: editFormData.notes,
          address: editFormData.address,
          cart: editFormData.cart?.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            imageUrl: item.imageUrl,
            selectedSize: item.selectedSize,
            quantity: item.quantity.toString(),
          })),
          total: editFormData.total,
          shippingCost: editFormData.shippingCost,
          consignment_id: editFormData?.consignment_id,
        }),
      });

      if (response.ok) {
        // If order update was successful, update inventory
        if (inventoryUpdates.length > 0) {
          try {
            await fetch("/api/orders/update-quantity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ updates: inventoryUpdates }),
            });
          } catch (error) {
            console.error("Error updating inventory after order edit:", error);
            // Don't block the order update if inventory update fails
          }
        }

        toast.success("Order updated successfully!");
        closeEditModal();

        // Refresh the page to show updated data
        router.refresh();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to update order");
      }
    } catch (error) {
      toast.error("Error updating order");
      console.error("Error:", error);
    }
  };

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: { xs: "90%", sm: "80%", md: "70%" },
    maxWidth: 800,
    maxHeight: "90vh",
    overflow: "auto",
    bgcolor: "background.paper",
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
  };

  // Add a new function to handle product removal
  const removeProductFromOrder = (index) => {
    // Create a copy of the cart without the removed item
    const newCart = editFormData.cart.filter((_, i) => i !== index);

    // Recalculate total with shipping cost
    const cartTotal = calculateTotal(newCart);
    const newTotal = cartTotal + editFormData.shippingCost;

    setEditFormData({
      ...editFormData,
      cart: newCart,
      total: newTotal,
    });
  };

  const handleDelete = async (orderId) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Order deleted successfully!");
        router.refresh(); // Refresh the page data
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to delete order");
      }
    } catch (error) {
      toast.error("Error deleting order");
      console.error("Error:", error);
    }
  };

  const confirmDelete = (order) => {
    setOrderToDelete(order);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (orderToDelete) {
      await handleDelete(orderToDelete.orderID);
      setDeleteConfirmOpen(false);
      setOrderToDelete(null);
    }
  };

  // Update handleRefresh to also refresh counts
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);

      await router.refresh();
      await fetchTotalCounts();
      toast.success("Orders refreshed successfully!");
    } catch (error) {
      toast.error("Error refreshing orders");
      console.error("Error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  //handleDownloadInvoice

  const handleDownloadInvoice = async (consignment_id) => {
    try {
      const response = await fetch("/api/invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consignments: [`${consignment_id}`],
        }),
      });

      const contentType = response.headers.get("Content-Type");

      if (response.ok && contentType === "application/pdf") {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "invoice.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          toast.error(errorJson.message || "Failed to download invoice");
        } catch {
          toast.error("Unexpected response from server");
          console.error("Raw error response:", errorText);
        }
      }
    } catch (error) {
      toast.error("Error downloading invoice");
      console.error("Error:", error);
    }
  };

  // Frontend - Improved status fetching with better error handling
  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    const run = async () => {
      await wait(300); // Slightly longer debounce
      if (cancelled) return;

      const uniqIds = Array.from(
        new Set((orders || []).map((o) => o?.consignment_id).filter(Boolean))
      );

      if (uniqIds.length === 0) return;

      const updates = {};

      // Check cache first
      const uncachedIds = uniqIds.filter((id) => {
        if (cacheRef.current.has(id)) {
          const cached = cacheRef.current.get(id);
          // Only use cache if it's not an error and not too old (5 minutes)
          if (
            cached.status !== "Error" &&
            cached.status !== "Unknown" &&
            Date.now() - cached.timestamp < 5 * 60 * 1000
          ) {
            updates[id] = cached.status;
            return false;
          }
        }
        return true;
      });

      if (uncachedIds.length === 0) {
        setOrderStatuses((prev) => ({ ...prev, ...updates }));
        return;
      }

      // Set loading states
      uncachedIds.forEach((id) => {
        updates[id] = "Loading...";
      });
      setOrderStatuses((prev) => ({ ...prev, ...updates }));

      // Sequential fetching with delays (more reliable than concurrent)
      const BATCH_SIZE = 5; // Process 5 at a time
      const DELAY_BETWEEN_BATCHES = 2000; // 2 second delay between batches
      const DELAY_BETWEEN_REQUESTS = 200; // 200ms between individual requests

      for (let i = 0; i < uncachedIds.length; i += BATCH_SIZE) {
        if (cancelled) break;

        const batch = uncachedIds.slice(i, i + BATCH_SIZE);

        // Process batch sequentially
        for (const id of batch) {
          if (cancelled) break;

          try {
            const res = await fetch(
              `/api/get-order-status?id=${encodeURIComponent(id)}`,
              { signal: ac.signal }
            );

            const data = await res.json();

            if (res.ok && data) {
              const status = data.order_status || "Unknown";

              // Only cache non-error responses
              if (status !== "Error" && !data.error) {
                cacheRef.current.set(id, {
                  status,
                  timestamp: Date.now(),
                });
              }

              // Update UI immediately
              setOrderStatuses((prev) => ({
                ...prev,
                [id]: status,
              }));
            } else {
              // On error, show a user-friendly message but don't cache it
              setOrderStatuses((prev) => ({
                ...prev,
                [id]: "—", // Show dash instead of error
              }));
              console.warn(`Failed to fetch ${id}:`, data);
            }
          } catch (error) {
            if (!cancelled && error.name !== "AbortError") {
              setOrderStatuses((prev) => ({
                ...prev,
                [id]: "—",
              }));
              console.error(`Error fetching ${id}:`, error);
            }
          }

          // Small delay between requests in the same batch
          if (!cancelled) {
            await wait(DELAY_BETWEEN_REQUESTS);
          }
        }

        // Longer delay between batches
        if (i + BATCH_SIZE < uncachedIds.length && !cancelled) {
          await wait(DELAY_BETWEEN_BATCHES);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [orders]);
  return (
    <Box>
      <Stack direction="row" spacing={2} mb={3}>
        <button
          onClick={() => handleTypeFilter("")}
          className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 border 
      ${
        orderType === ""
          ? "bg-black text-white shadow-md border-black"
          : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
      }`}
        >
          All Orders
        </button>
        <button
          onClick={() => handleTypeFilter("web")}
          className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 border 
      ${
        orderType === "web"
          ? "bg-black text-white shadow-md border-black"
          : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
      }`}
        >
          Website Orders
        </button>

        <button
          onClick={() => handleTypeFilter("manual")}
          className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 border 
      ${
        orderType === "manual"
          ? "bg-black text-white shadow-md border-black"
          : "bg-white text-gray-800 border-gray-300 hover:bg-gray-100"
      }`}
        >
          Manual Orders
        </button>
      </Stack>

      {/* Status Filter Buttons */}
      <Box mb={3} display="flex" justifyContent="flex-start">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(3, 1fr)",
              sm: "repeat(6, auto)",
            },
            gap: 1,
            width: "100%",
          }}
        >
          <Button
            onClick={() => handleStatusFilter("all")}
            variant={statusFilter === "all" ? "contained" : "outlined"}
            fullWidth
          >
            All ({statusCounts.all})
          </Button>
          <Button
            onClick={() => handleStatusFilter("pending")}
            variant={statusFilter === "pending" ? "contained" : "outlined"}
            sx={{ bgcolor: statusFilter === "pending" ? "#FFC107" : "inherit" }}
            fullWidth
          >
            Pending ({statusCounts.pending})
          </Button>
          <Button
            onClick={() => handleStatusFilter("confirmed")}
            variant={statusFilter === "confirmed" ? "contained" : "outlined"}
            sx={{
              bgcolor: statusFilter === "confirmed" ? "#FFC107" : "inherit",
            }}
            fullWidth
          >
            Confirmed ({statusCounts.confirmed})
          </Button>
          <Button
            onClick={() => handleStatusFilter("shipped")}
            variant={statusFilter === "shipped" ? "contained" : "outlined"}
            sx={{ bgcolor: statusFilter === "shipped" ? "#90CAF9" : "inherit" }}
            fullWidth
          >
            Shipped ({statusCounts.shipped})
          </Button>
          <Button
            onClick={() => handleStatusFilter("delivered")}
            variant={statusFilter === "delivered" ? "contained" : "outlined"}
            sx={{
              bgcolor: statusFilter === "delivered" ? "#66BB6A" : "inherit",
            }}
            fullWidth
          >
            Delivered ({statusCounts.delivered})
          </Button>
          <Button
            onClick={() => handleStatusFilter("exchange")}
            variant={statusFilter === "exchange" ? "contained" : "outlined"}
            sx={{
              bgcolor: statusFilter === "exchange" ? "#EF5350" : "inherit",
              color: statusFilter === "exchange" ? "white" : "inherit",
            }}
            fullWidth
          >
            exchange ({statusCounts.exchange})
          </Button>
          <Button
            onClick={() => handleStatusFilter("returned")}
            variant={statusFilter === "returned" ? "contained" : "outlined"}
            sx={{
              bgcolor: statusFilter === "returned" ? "#EF5350" : "inherit",
              color: statusFilter === "returned" ? "white" : "inherit",
            }}
            fullWidth
          >
            Returned ({statusCounts.returned})
          </Button>
        </Box>
      </Box>

      {/* Date Filter Section */}
      <Box
        mb={3}
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              width: "100%",
            }}
          >
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                },
              }}
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                },
              }}
            />
          </Box>
        </LocalizationProvider>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            width: "100%",
          }}
        >
          <Button
            variant="contained"
            onClick={handleDateFilter}
            fullWidth
            sx={{
              bgcolor: "#5db461",
              "&:hover": { bgcolor: "#4a8f4d" },
            }}
          >
            Apply Date Filter
          </Button>
          <Button variant="outlined" onClick={clearDateFilter} fullWidth>
            Clear Dates
          </Button>
        </Box>
      </Box>

      {/* Search Input for Customer Phone Number */}
      <Box mb={3} display="flex" alignItems="center" gap={2}>
        <TextField
          label="Search by Customer Phone"
          variant="outlined"
          value={phoneInput}
          onChange={(e) => {
            const value = e.target.value;
            setPhoneInput(value);
            handleNumberSearch(value);
          }}
          sx={{ width: "100%", maxWidth: 300 }}
        />
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`px-4 py-2 rounded-full font-semibold transition-all duration-300 border 
          bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-2
          ${isRefreshing ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <IoRefresh
            className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </Box>

      <h1 className="flex items-center justify-center text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 relative">
        <span className="inline-block bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text drop-shadow-md">
          {orderType === "manual" ? "Manual Orders" : "Website Orders"}
        </span>
      </h1>

      <TableContainer
        component={Paper}
        sx={{
          overflowX: "auto",
          width: "100%",
          maxWidth: "100vw",
          "& .MuiTableCell-root": {
            padding: { xs: "8px 4px", sm: "16px 8px", md: "16px" },
            fontSize: { xs: "0.75rem", sm: "0.875rem", md: "1rem" },
          },
        }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" className="">
                  <h1 className="py-20 text-4xl font-bold">No orders found</h1>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredOrders?.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell>{order.orderID}</TableCell>
                    <TableCell>
                      {order?.formData?.name || "N/A"}
                      <br />
                      {order?.formData?.phone || "N/A"}
                      <br />
                      <Link
                        className="btn text-black bg-white border-black border w-full"
                        href={`/orders/${order?.orderID}`}
                      >
                        Slip
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>৳{order.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Select
                        className={
                          order?.status === "pending"
                            ? "bg-yellow-400"
                            : order?.status === "shipped"
                            ? "bg-blue-300"
                            : order?.status === "delivered"
                            ? "bg-green-400"
                            : order?.status === "exchange"
                            ? "bg-orange-400"
                            : order?.status === "confirmed"
                            ? "bg-violet-600 !text-white"
                            : order?.status === "returned"
                            ? "bg-red-400"
                            : "bg-transparent" // For other statuses
                        }
                        value={updatedOrder[order?.orderID] || order?.status}
                        onChange={(e) =>
                          handleStatusChange(order?.orderID, e.target.value)
                        }
                        sx={{
                          minWidth: { xs: 80, sm: 100, md: 120 },
                          fontSize: {
                            xs: "0.75rem",
                            sm: "0.875rem",
                            md: "1rem",
                          },
                        }}
                      >
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="confirmed">Confirmed</MenuItem>
                        <MenuItem value="shipped">Shipped</MenuItem>
                        <MenuItem value="exchange">Exchange</MenuItem>
                        <MenuItem value="delivered">Delivered</MenuItem>
                        <MenuItem value="returned">Returned</MenuItem>
                      </Select>
                      <div className="flex items-center justify-center mt-1">
                        {order?.consignment_id ? (
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold capitalize text-center
                    ${
                      orderStatuses[order.consignment_id] === "Delivered"
                        ? "bg-green-100 text-green-700"
                        : orderStatuses[order.consignment_id] === "Pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : order?.status === "exchange"
                        ? "bg-orange-400"
                        : orderStatuses[order.consignment_id] === "Return"
                        ? "bg-red-100 text-red-700"
                        : orderStatuses[order.consignment_id] === "Paid Return"
                        ? "bg-red-100 text-red-700"
                        : orderStatuses[order.consignment_id] ===
                          "Limit reached please wait"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-800"
                    }`}
                          >
                            {orderStatuses[order.consignment_id] ||
                              "Loading..."}
                          </span>
                        ) : (
                          "-"
                        )}
                      </div>
                      <SuccessRateModal phoneNumber={order?.formData?.phone} />
                    </TableCell>

                    <TableCell>
                      {order.cart?.map((item, idx) => (
                        <Box
                          key={idx}
                          display="flex"
                          alignItems="center"
                          mb={2}
                        >
                          {item?.imageUrl && item?.imageUrl?.length > 0 ? (
                            <Image
                              src={item?.imageUrl[0] || "/placeholder.svg"}
                              alt={item?.name || "Image"}
                              width={40}
                              height={40}
                              style={{ marginRight: 10, objectFit: "cover" }}
                            />
                          ) : (
                            <Box
                              width={40}
                              height={40}
                              sx={{
                                backgroundColor: "#f0f0f0",
                                marginRight: 1,
                              }}
                            />
                          )}
                          <Box>
                            <Typography variant="subtitle1">
                              {item.name}-{item.id}
                            </Typography>
                            <Typography variant="body2">
                              Size: {item.selectedSize}
                            </Typography>
                            <Typography variant="body2">
                              Quantity: {item.quantity}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexDirection="column" gap={1}>
                        {order?.consignment_id && (
                          <>
                            <Button
                              variant="contained"
                              color="primary"
                              sx={{
                                padding: { xs: 1 },
                                fontSize: {
                                  xs: "0.75rem",
                                },
                                bgcolor: "#cc1eeb",
                                color: "#fff",
                                fontWeight: "600",
                              }}
                              onClick={() =>
                                handleDownloadInvoice(order?.consignment_id)
                              }
                            >
                              Download Invoice
                            </Button>
                          </>
                        )}
                        <Button
                          variant="contained"
                          color="primary"
                          sx={{
                            padding: { xs: 1 },
                            fontSize: {
                              xs: "0.75rem",
                              sm: "0.875rem",
                              md: "1rem",
                            },
                            bgcolor: "#5db461",
                            color: "#fff",
                            fontWeight: "600",
                          }}
                          onClick={() => handleSave(order.orderID)}
                          disabled={disabledSave[order.orderID]}
                        >
                          Save
                        </Button>

                        <Button
                          variant="outlined"
                          color="primary"
                          sx={{
                            padding: { xs: 1 },
                            fontSize: {
                              xs: "0.75rem",
                              sm: "0.875rem",
                              md: "1rem",
                            },
                            fontWeight: "600",
                          }}
                          onClick={() => openEditModal(order)}
                          startIcon={<FiEdit />}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          sx={{
                            padding: { xs: 1 },
                            fontSize: {
                              xs: "0.75rem",
                              sm: "0.875rem",
                              md: "1rem",
                            },
                            fontWeight: "600",
                          }}
                          onClick={() => confirmDelete(order)}
                          startIcon={<MdDeleteForever />}
                        >
                          Delete
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          shape="rounded"
          color="primary"
          variant="outlined"
        />
      </Box>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this order? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Order Modal */}
      <EditOrderModal
        editModalOpen={editModalOpen}
        closeEditModal={closeEditModal}
        modalStyle={modalStyle}
        editingOrder={editingOrder}
        handleEditSubmit={handleEditSubmit}
        editFormData={editFormData}
        handlePhoneChange={handlePhoneChange}
        handleNotesChange={handleNotesChange}
        handleAddressChange={handleAddressChange}
        handleShippingCostChange={handleShippingCostChange}
        handleConsignmentChange={handleConsignmentChange}
        productSearchQuery={productSearchQuery}
        setProductSearchQuery={setProductSearchQuery}
        isTyping={isTyping}
        setIsTyping={setIsTyping}
        products={products}
        addProductToOrder={addProductToOrder}
        handleItemSizeChange={handleItemSizeChange}
        handleItemQuantityChange={handleItemQuantityChange}
        handleItemPriceChange={handleItemPriceChange}
        removeProductFromOrder={removeProductFromOrder}
      />
    </Box>
  );
};

export default OrdersTable;
