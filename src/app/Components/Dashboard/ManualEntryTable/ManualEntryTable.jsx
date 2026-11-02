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
} from "@mui/material";
import { Pagination } from "@mui/material";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { IoCheckmarkCircleOutline } from "react-icons/io5";
import { FiEdit } from "react-icons/fi";
import toast from "react-hot-toast";
import Link from "next/link";
import axios from "axios";
import EditOrderModal from "../../modals/EditOrderModal";
import SearchField from "../../ManualOrderComponents/SearchField";
import { modalStyle } from "@/app/const/modalStyle";
import { useAuth } from "@/app/services/AuthProvider";

const ManualEntryTable = ({ orders, totalPages, currentPage }) => {
  const [page, setPage] = useState(currentPage || 1);
  const [updatedOrder, setUpdatedOrder] = useState({});
  const [disabledSave, setDisabledSave] = useState({});
  const [initialStatus, setInitialStatus] = useState({});
  const [orderSearchQuery, setOrderSearchQuery] = useState(""); // For order search functionality
  const [phoneInput, setPhoneInput] = useState("");

  const [productSearchQuery, setProductSearchQuery] = useState(""); // For product search functionality
  const [filteredOrders, setFilteredOrders] = useState(orders); // State for filtered orders
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";
  const [products, setProducts] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const [newOrderData, setNewOrderData] = useState({
    formData: {
      name: "",
      email: "",
      address: "",
      phone: "",
      notes: "",
    },
    cart: [],
    paymentOption: "cash",
    shippingOption: "insideDhaka",
    total: 0,
    shippingCost: 80,
    discount: 0,
    advance: 0,
    status: "pending",
    moderatorEmail: user?.email || "",
  });

  // Edit order modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editFormData, setEditFormData] = useState({
    phone: "",
    notes: "",
    address: "",
    cart: [],
    total: 0,
    shippingCost: 0, // Added shipping cost field
    advance: 0,
  });

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
            .includes(orderSearchQuery.toLowerCase()),
        ),
      );
    } else {
      setFilteredOrders(orders); // Reset to full list if no query
    }
  }, [orderSearchQuery, orders]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    router.push(`/dashboard/moderator-entry?page=${newPage}`);
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
          toast.success("Order status updated successfully!");

          // Get the order details
          const orderDetails = orders.find(
            (order) => order.orderID === orderId,
          );

          // Handle inventory updates based on status change
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
          // The delivered case is no longer needed since quantities are already deducted at checkout

          setInitialStatus((prev) => ({ ...prev, [orderId]: updatedStatus }));
          setDisabledSave((prev) => ({ ...prev, [orderId]: true }));
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
    router.push(`/dashboard/all-orders?page=1&status=${status}`);
  };

  // Edit order functions
  const openEditModal = (order) => {
    setEditingOrder(order);
    setEditFormData({
      name: order.formData?.name || "",
      email: order.formData?.email || "",
      phone: order.formData?.phone || "",
      address: order.formData?.address || "",
      notes: order.formData?.notes || "",
      paymentOption: order.paymentOption || "cash",
      shippingOption: order.shippingOption || "insideDhaka",
      discount: order.discount || 0,
      status: order.status || "pending",
      consignment_id: order.consignment_id || "",
      shippingCost: order.shippingCost || 0,
      advance: order.advance || 0,
      total: order.total || 0,
      cart: [
        ...order.cart?.map((item) => ({
          ...item,
          quantity: Number.parseInt(item.quantity, 10),
          originalPrice: item.price,
        })),
      ],
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

  const handleShippingCostChange = (value) => {
    const shippingCost = Number.parseInt(value, 10) || 0;

    // Recalculate total with new shipping cost
    const cartTotal = calculateTotal(editFormData.cart);
    const baseTotal = cartTotal + shippingCost;
    const newTotal = baseTotal - editFormData.advance - editFormData.discount;

    setEditFormData({
      ...editFormData,
      shippingCost: shippingCost,
      total: Math.max(0, newTotal),
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

  const handleTotalChange = (value) => {
    const totalV = Number.parseInt(value, 10) || 0;
    setEditFormData({
      ...editFormData,
      total: totalV,
    });
  };

  const handleAdvanceChange = (value) => {
    const advanceValue = Number.parseInt(value, 10) || 0;
    // Calculate base total (cart + shipping cost)
    const baseTotal =
      calculateTotal(editFormData.cart) + editFormData.shippingCost;
    // Subtract advance from base total
    const newTotal = Math.max(
      0,
      baseTotal - advanceValue - editFormData.discount,
    );

    setEditFormData({
      ...editFormData,
      advance: advanceValue,
      total: newTotal,
    });
  };
  const handleDiscountChange = (value) => {
    const discountValue = Number.parseInt(value, 10) || 0;
    // Calculate base total (cart + shipping cost)
    const baseTotal =
      calculateTotal(editFormData.cart) + editFormData.shippingCost;
    // Subtract discount from base total
    const newTotal = Math.max(
      0,
      baseTotal - discountValue - editFormData.advance,
    );

    setEditFormData({
      ...editFormData,
      discount: discountValue,
      total: newTotal,
    });
  };

  const handleEditShippingChange = (value) => {
    let cost = 0;
    switch (value) {
      case "insideDhaka":
        cost = 80;
        break;
      case "dhakaSubCity":
        cost = 110;
        break;
      case "outsideDhaka":
        cost = 140;
        break;
      default:
        cost = 0;
    }

    // Calculate base total (cart + shipping cost)
    const baseTotal = calculateTotal(editFormData.cart);
    // Subtract advance from base total
    const newTotal = Math.max(
      0,
      baseTotal + cost - editFormData.discount - editFormData.advance,
    );

    setEditFormData({
      ...editFormData,
      shippingOption: value,
      shippingCost: cost,
      total: newTotal,
    });
  };

  const handleShippingOptionChange = (value) => {
    let cost = 0;
    switch (value) {
      case "insideDhaka":
        cost = 80;
        break;
      case "dhakaSubCity":
        cost = 110;
        break;
      case "outsideDhaka":
        cost = 140;
        break;
      default:
        cost = 0;
    }

    const cartTotal = newOrderData.cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const discount = newOrderData.discount || 0;
    const advance = newOrderData.advance || 0;
    const newTotal = cartTotal + cost - discount - advance;
    console.log(newTotal);
    handleNewOrderFieldChange("shippingOption", value);
    handleNewOrderFieldChange("shippingCost", cost);
    handleNewOrderFieldChange("total", newTotal);
  };

  const handleItemQuantityChange = (index, value) => {
    const newCart = [...editFormData.cart];
    const newQuantity = Number.parseInt(value, 10) || 0;
    newCart[index].quantity = newQuantity;

    // Recalculate total
    const cartTotal = calculateTotal(newCart);
    const baseTotal = cartTotal + editFormData.shippingCost;
    const newTotal = baseTotal - editFormData.advance;

    setEditFormData({
      ...editFormData,
      cart: newCart,
      total: Math.max(0, newTotal),
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
    const baseTotal = cartTotal + editFormData.shippingCost;
    const newTotal = baseTotal - editFormData.advance;

    setEditFormData({
      ...editFormData,
      cart: newCart,
      total: Math.max(0, newTotal),
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
    const selectedSize = "M";

    const newItem = {
      id: product.id,
      name: product.name,
      price: productPrice, // Use offerPrice if available
      imageUrl: product.imageUrl || [],
      selectedSize,
      quantity: 1,
      originalPrice: product.price, // Store original price for reference
    };

    const newCart = [...editFormData.cart, newItem];

    // Recalculate total with shipping cost and advance
    const cartTotal = calculateTotal(newCart);
    const baseTotal = cartTotal + editFormData.shippingCost;
    const newTotal = baseTotal - editFormData.advance - editFormData.discount;

    setEditFormData({
      ...editFormData,
      cart: newCart,
      total: Math.max(0, newTotal),
    });

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
      const getInventoryKey = (item) => `${item.id}-${item.selectedSize || ""}`;
      const buildInventoryQuantityMap = (items) => {
        return items.reduce((map, item) => {
          const key = getInventoryKey(item);
          const existingItem = map.get(key) || {
            productId: item.id,
            size: item.selectedSize,
            quantity: 0,
          };

          existingItem.quantity += Number.parseInt(item.quantity, 10) || 0;
          map.set(key, existingItem);

          return map;
        }, new Map());
      };

      const originalItemMap = buildInventoryQuantityMap(originalItems);
      const editedItemMap = buildInventoryQuantityMap(editFormData.cart);

      originalItemMap.forEach((originalItem, key) => {
        const editedItem = editedItemMap.get(key);
        const quantityDiff =
          originalItem.quantity - (editedItem?.quantity || 0);

        if (quantityDiff !== 0) {
          inventoryUpdates.push({
            productId: originalItem.productId,
            size: originalItem.size,
            quantity: quantityDiff, // Positive adds to inventory, negative removes
          });
        }
      });

      editedItemMap.forEach((editedItem, key) => {
        if (!originalItemMap.has(key)) {
          inventoryUpdates.push({
            productId: editedItem.productId,
            size: editedItem.size,
            quantity: -editedItem.quantity, // Remove new product-size rows from inventory
          });
        }
      });

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
          shippingCost: editFormData.shippingCost, // Include shipping cost in update
          advance: editFormData.advance, // Include advance in update
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

  // Add a new function to handle product removal
  const removeProductFromOrder = (index) => {
    // Create a copy of the cart without the removed item
    const newCart = editFormData.cart.filter((_, i) => i !== index);

    // Recalculate total with shipping cost and advance
    const cartTotal = calculateTotal(newCart);
    const baseTotal = cartTotal + editFormData.shippingCost;
    const newTotal = baseTotal - editFormData.advance;

    setEditFormData({
      ...editFormData,
      cart: newCart,
      total: Math.max(0, newTotal),
    });
  };

  const openAddModal = () => {
    setAddModalOpen(true);
    setProductSearchQuery("");
    setProducts([]);
    setNewOrderData({
      formData: {
        name: "",
        email: "",
        address: "",
        phone: "",
        notes: "",
      },
      cart: [],
      paymentOption: "cash",
      shippingOption: "insideDhaka",
      total: 0,
      shippingCost: 80,
      discount: 0,
      status: "pending",
      moderatorEmail: user?.email || "",
    });
  };

  const handleNumberSearch = (phone) => {
    const query = new URLSearchParams();
    query.set("page", "1"); // Reset to first page when changing type

    if (phone) {
      query.set("phone", phone);
    }

    router.push(`/dashboard/moderator-entry?${query.toString()}`);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
  };

  const handleNewOrderFormChange = (field, value) => {
    setNewOrderData((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value,
      },
    }));
  };

  const handleNewOrderFieldChange = (field, value) => {
    setNewOrderData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addProductToNewOrder = (product) => {
    const productPrice = product.offerPrice || product.price;

    const existingItemIndex = newOrderData.cart.findIndex(
      (item) => item.id === product.id,
    );

    // if (existingItemIndex >= 0) {
    //   const newCart = [...newOrderData.cart];
    //   newCart[existingItemIndex].quantity += 1;

    //   const cartTotal = newCart.reduce(
    //     (sum, item) => sum + item.price * item.quantity,
    //     0
    //   );
    //   const newTotal =
    //     cartTotal + newOrderData.shippingCost - newOrderData.discount;

    //   setNewOrderData((prev) => ({
    //     ...prev,
    //     cart: newCart,
    //     total: newTotal,
    //   }));
    // }
    // else {
    const newItem = {
      id: product.id,
      name: product.name,
      price: productPrice,
      imageUrl: product.imageUrl || [],
      selectedSize: "M",
      quantity: 1,
    };

    const newCart = [...newOrderData.cart, newItem];
    const cartTotal = newCart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const newTotal =
      cartTotal + newOrderData.shippingCost - newOrderData.discount;

    setNewOrderData((prev) => ({
      ...prev,
      cart: newCart,
      total: newTotal,
    }));
    // }

    setProductSearchQuery("");
    setProducts([]);
  };

  const removeProductFromNewOrder = (index) => {
    const newCart = newOrderData.cart.filter((_, i) => i !== index);
    const cartTotal = newCart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const newTotal =
      cartTotal + newOrderData.shippingCost - newOrderData.discount;

    setNewOrderData((prev) => ({
      ...prev,
      cart: newCart,
      total: newTotal,
    }));
  };

  const handleNewItemQuantityChange = (index, value) => {
    const newCart = [...newOrderData.cart];
    const newQuantity = Number.parseInt(value, 10) || 0;
    newCart[index].quantity = newQuantity;

    const cartTotal = newCart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const newTotal =
      cartTotal + newOrderData.shippingCost - newOrderData.discount;

    setNewOrderData((prev) => ({
      ...prev,
      cart: newCart,
      total: newTotal,
    }));
  };

  const handleNewItemSizeChange = (index, value) => {
    const newCart = [...newOrderData.cart];
    newCart[index].selectedSize = value;

    setNewOrderData((prev) => ({
      ...prev,
      cart: newCart,
    }));
  };

  const handleNewItemPriceChange = (index, value) => {
    const newCart = [...newOrderData.cart];
    const newPrice = Number.parseFloat(value) || 0;
    newCart[index].price = newPrice;

    const cartTotal = newCart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const newTotal =
      cartTotal + newOrderData.shippingCost - newOrderData.discount;

    setNewOrderData((prev) => ({
      ...prev,
      cart: newCart,
      total: newTotal,
    }));
  };

  const handleAddOrderSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (newOrderData.cart.length === 0) {
      toast.error("Please add at least one product to the order");
      return;
    }

    if (!newOrderData.formData.phone) {
      toast.error("Phone number is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Format cart items to match expected format
      const formattedCart = newOrderData.cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price.toString(),
        imageUrl: item.imageUrl,
        selectedSize: item.selectedSize,
        quantity: item.quantity.toString(),
      }));

      const orderData = {
        ...newOrderData,
        cart: formattedCart,
        type: "manual",
        moderatorEmail: user?.email || "", // Ensure moderator email is included
        createdAt: new Date().toISOString(),
      };

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const result = await response.json();

        // Update inventory for the new order
        const inventoryUpdates = formattedCart.map((item) => ({
          productId: item.id,
          size: item.selectedSize,
          quantity: -Number.parseInt(item.quantity, 10), // Negative to remove from inventory
        }));

        if (inventoryUpdates.length > 0) {
          try {
            await fetch("/api/orders/update-quantity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ updates: inventoryUpdates }),
            });
          } catch (error) {
            console.error(
              "Error updating inventory after order creation:",
              error,
            );
            // Don't block the order creation if inventory update fails
          }
        }

        toast.success(`Order #${result.orderID} created successfully!`);
        closeAddModal();
        router.refresh();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to create order");
      }
    } catch (error) {
      toast.error("Error creating order");
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // if (orders?.length === 0) {
  //   return <NoOrderFound handleStatusFilter={handleStatusFilter} />;
  // }

  return (
    <Box>
      {/* <Typography variant="h4" gutterBottom>
        All Orders
      </Typography> */}

      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 4 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={openAddModal}
          sx={{
            bgcolor: "#5db461",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1.1rem",
            px: 4,
            py: 1.5,
            borderRadius: "12px",
            boxShadow: "0px 4px 20px rgba(93, 180, 97, 0.5)",
            textTransform: "none",
            transition: "all 0.3s ease",
            "&:hover": {
              bgcolor: "#4a9350",
              transform: "scale(1.05)",
              boxShadow: "0px 6px 24px rgba(74, 147, 80, 0.6)",
            },
          }}
        >
          + Add New Order
        </Button>
      </Box>

      {/* Search Input for Customer Phone Number */}

      <h1 className="flex items-center justify-center text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 relative">
        <span className="inline-block bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text drop-shadow-md">
          Manual Orders (Only)
        </span>
      </h1>

      <SearchField
        phoneInput={phoneInput}
        setPhoneInput={setPhoneInput}
        handleNumberSearch={handleNumberSearch}
      />
      {orders?.length === 0 ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <h2 className="text-5xl font-semibold text-gray-600">
            No orders found
          </h2>
        </div>
      ) : (
        <>
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
                      {new Date(order?.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>৳{order?.total?.toFixed(2)}</TableCell>
                    <TableCell>
                      <Select
                        className={
                          order?.status === "pending"
                            ? "bg-yellow-400"
                            : order?.status === "hold"
                              ? "bg-rose-700"
                              : order?.status === "shipped"
                                ? "bg-blue-300"
                                : order?.status === "delivered"
                                  ? "bg-green-400"
                                  : order?.status === "confirmed"
                                    ? "bg-violet-600 !text-white"
                                    : order?.status === "exchange"
                                      ? "bg-orange-400"
                                      : order?.status === "returned"
                                        ? "bg-red-400"
                                        : order?.status === "trashed"
                                          ? "bg-gray-400 "
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
                        <MenuItem value="hold">Hold</MenuItem>
                        <MenuItem value="confirmed">Confirmed</MenuItem>
                        <MenuItem value="shipped">Shipped</MenuItem>
                        <MenuItem value="delivered">Delivered</MenuItem>
                        <MenuItem value="returned">Returned</MenuItem>
                        <MenuItem value="exchange">Exchange</MenuItem>
                        <MenuItem value="trashed">Trashed</MenuItem>
                      </Select>
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
                        <Button
                          variant="contained"
                          color="primary"
                          sx={{
                            padding: { xs: 1, sm: 2, md: 3 },
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
                          startIcon={<IoCheckmarkCircleOutline />}
                          disabled={disabledSave[order.orderID]}
                        >
                          Save
                        </Button>

                        <Button
                          variant="outlined"
                          color="primary"
                          sx={{
                            padding: { xs: 1, sm: 2, md: 3 },
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
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

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
        handleAdvanceChange={handleAdvanceChange}
        handleDiscountChange={handleDiscountChange}
        handleEditShippingChange={handleEditShippingChange}
        handleTotalChange={handleTotalChange}
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
      {/* Add Order Modal */}
      <Box
        component="div"
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          bgcolor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1000,
          display: addModalOpen ? "flex" : "none",
          justifyContent: "center",
          alignItems: "center",
          overflow: "auto",
        }}
      >
        <Box
          component="div"
          sx={{
            ...modalStyle,
            width: { xs: "95%", sm: "90%", md: "80%" },
            maxWidth: "900px",
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          <Typography variant="h5" component="h2" gutterBottom>
            Add New Order
          </Typography>
          <Box component="form" onSubmit={handleAddOrderSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Customer Information
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  label="Name"
                  fullWidth
                  value={newOrderData.formData.name}
                  onChange={(e) =>
                    handleNewOrderFormChange("name", e.target.value)
                  }
                  margin="normal"
                />
                <TextField
                  label="Phone"
                  fullWidth
                  required
                  value={newOrderData.formData.phone}
                  onChange={(e) =>
                    handleNewOrderFormChange("phone", e.target.value)
                  }
                  margin="normal"
                />
                <TextField
                  label="Email"
                  fullWidth
                  value={newOrderData.formData.email}
                  onChange={(e) =>
                    handleNewOrderFormChange("email", e.target.value)
                  }
                  margin="normal"
                />
                <TextField
                  label="Address"
                  fullWidth
                  value={newOrderData.formData.address}
                  onChange={(e) =>
                    handleNewOrderFormChange("address", e.target.value)
                  }
                  margin="normal"
                />
                <TextField
                  label="Notes"
                  fullWidth
                  value={newOrderData.formData.notes}
                  onChange={(e) =>
                    handleNewOrderFormChange("notes", e.target.value)
                  }
                  margin="normal"
                />
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Order Details
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
                  gap: 2,
                }}
              >
                <TextField
                  select
                  label="Payment Option"
                  fullWidth
                  value={newOrderData.paymentOption}
                  onChange={(e) =>
                    handleNewOrderFieldChange("paymentOption", e.target.value)
                  }
                  margin="normal"
                >
                  <MenuItem value="cash">Cash on Delivery</MenuItem>
                  <MenuItem value="bkash">bKash</MenuItem>
                  <MenuItem value="nagad">Nagad</MenuItem>
                  <MenuItem value="rocket">Rocket</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Shipping Option"
                  fullWidth
                  value={newOrderData.shippingOption}
                  onChange={(e) => handleShippingOptionChange(e.target.value)}
                  margin="normal"
                >
                  <MenuItem value="insideDhaka">Inside Dhaka</MenuItem>
                  <MenuItem value="dhakaSubCity">Dhaka Sub City</MenuItem>
                  <MenuItem value="outsideDhaka">Outside Dhaka</MenuItem>
                </TextField>

                <TextField
                  label="Shipping Cost"
                  type="number"
                  fullWidth
                  value={newOrderData.shippingCost}
                  onChange={(e) => {
                    const cost = Number.parseInt(e.target.value, 10) || 0;
                    const cartTotal = newOrderData.cart.reduce(
                      (sum, item) => sum + item.price * item.quantity,
                      0,
                    );
                    const discount = Number(newOrderData?.discount) || 0;
                    const advance = Number(newOrderData?.advance) || 0;
                    const newTotal = cartTotal + cost - discount - advance;

                    handleNewOrderFieldChange("shippingCost", cost);
                    handleNewOrderFieldChange("total", newTotal);
                  }}
                  margin="normal"
                />
                <TextField
                  label="Discount"
                  type="number"
                  fullWidth
                  value={newOrderData?.discount}
                  onChange={(e) => {
                    const discount = Number.parseInt(e.target.value, 10) || 0;

                    const cartTotal = (newOrderData?.cart || []).reduce(
                      (sum, item) =>
                        sum + (item.price || 0) * (item.quantity || 0),
                      0,
                    );

                    const shippingCost =
                      Number(newOrderData?.shippingCost) || 0;
                    const advance = Number(newOrderData?.advance) || 0;

                    const newTotal =
                      cartTotal + shippingCost - discount - advance;

                    handleNewOrderFieldChange("discount", discount);
                    handleNewOrderFieldChange("total", newTotal);
                  }}
                  margin="normal"
                />
                <TextField
                  label="Advance"
                  type="number"
                  fullWidth
                  value={newOrderData.advance}
                  onChange={(e) => {
                    const advance = Number.parseInt(e.target.value, 10) || 0;
                    const cartTotal = newOrderData.cart.reduce(
                      (sum, item) => sum + item.price * item.quantity,
                      0,
                    );
                    const newTotal =
                      cartTotal +
                      newOrderData?.shippingCost -
                      advance -
                      newOrderData?.discount;

                    handleNewOrderFieldChange("advance", advance);
                    handleNewOrderFieldChange("total", newTotal);
                  }}
                  margin="normal"
                />
                <TextField
                  label="Total"
                  type="number"
                  fullWidth
                  value={newOrderData.total}
                  onChange={(e) =>
                    handleNewOrderFieldChange(
                      "total",
                      Number.parseInt(e.target.value, 10) || 0,
                    )
                  }
                  margin="normal"
                />
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Products
              </Typography>
              <TextField
                label="Search Products"
                fullWidth
                value={productSearchQuery}
                onChange={(e) => {
                  setProductSearchQuery(e.target.value);
                  setIsTyping(true);
                }}
                margin="normal"
              />

              {/* Product search results */}
              {products.length > 0 && (
                <Paper
                  sx={{ mt: 2, p: 2, maxHeight: "200px", overflow: "auto" }}
                >
                  {products.map((product) => (
                    <Box
                      key={product.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        p: 1,
                        cursor: "pointer",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.05)" },
                        borderBottom: "1px solid #eee",
                      }}
                      onClick={() => addProductToNewOrder(product)}
                    >
                      {product.imageUrl && product.imageUrl.length > 0 ? (
                        <Image
                          src={product.imageUrl[0] || "/placeholder.svg"}
                          alt={product.name}
                          width={40}
                          height={40}
                          style={{ marginRight: 10, objectFit: "cover" }}
                        />
                      ) : (
                        <Box
                          width={40}
                          height={40}
                          sx={{ bgcolor: "#f0f0f0", mr: 1 }}
                        />
                      )}
                      <Box>
                        <Typography variant="subtitle1">
                          {product.name} - {product.id}
                        </Typography>
                        <Typography variant="body2">
                          Price: ৳{product.offerPrice || product.price}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Paper>
              )}

              {/* Selected products */}
              {newOrderData.cart.length > 0 ? (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {newOrderData.cart.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              {item.imageUrl && item.imageUrl.length > 0 ? (
                                <Image
                                  src={item.imageUrl[0] || "/placeholder.svg"}
                                  alt={item.name}
                                  width={40}
                                  height={40}
                                  style={{
                                    marginRight: 10,
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <Box
                                  width={40}
                                  height={40}
                                  sx={{ bgcolor: "#f0f0f0", mr: 1 }}
                                />
                              )}
                              <Typography>
                                {item.name} - {item.id}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.selectedSize}
                              onChange={(e) =>
                                handleNewItemSizeChange(index, e.target.value)
                              }
                              size="small"
                            >
                              <MenuItem value="S">S</MenuItem>
                              <MenuItem value="M">M</MenuItem>
                              <MenuItem value="L">L</MenuItem>
                              <MenuItem value="XL">XL</MenuItem>
                              <MenuItem value="XXL">XXL</MenuItem>
                              {item.category === "shoes" && (
                                <>
                                  <MenuItem value="40">40</MenuItem>
                                  <MenuItem value="41">41</MenuItem>
                                  <MenuItem value="42">42</MenuItem>
                                  <MenuItem value="43">43</MenuItem>
                                  <MenuItem value="44">44</MenuItem>
                                  <MenuItem value="45">45</MenuItem>
                                  <MenuItem value="(35-36)">(35-36)</MenuItem>
                                  <MenuItem value="(37-38)">(37-38)</MenuItem>
                                  <MenuItem value="(39-40)">(39-40)</MenuItem>
                                  <MenuItem value="(40-41)">(40-41)</MenuItem>
                                  <MenuItem value="(42-43)">(42-43)</MenuItem>
                                  <MenuItem value="(44-45)">(44-45)</MenuItem>
                                </>
                              )}
                            </Select>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={item.price}
                              onChange={(e) =>
                                handleNewItemPriceChange(index, e.target.value)
                              }
                              size="small"
                              sx={{ width: "80px" }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleNewItemQuantityChange(
                                  index,
                                  e.target.value,
                                )
                              }
                              size="small"
                              sx={{ width: "60px" }}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => removeProductFromNewOrder(index)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography sx={{ mt: 2, color: "text.secondary" }}>
                  No products added yet. Search and add products above.
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 3,
              }}
            >
              <Button variant="outlined" onClick={closeAddModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting}
                sx={{
                  bgcolor: "#5db461",
                  color: "#fff",
                  fontWeight: "600",
                  "&:disabled": {
                    bgcolor: "#a5d6a8",
                    color: "#fff",
                  },
                }}
              >
                {isSubmitting ? "Creating..." : "Create Order"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ManualEntryTable;
