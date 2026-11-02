"use client";
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  TextField,
  Modal,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import Image from "next/image";
const EditOrderModal = ({
  editModalOpen,
  closeEditModal,
  modalStyle,
  editingOrder,
  handleEditSubmit,
  editFormData,
  handlePhoneChange,
  handleNotesChange,
  handleShippingCostChange,
  handleAdvanceChange,
  handleTotalChange,
  handleConsignmentChange,
  productSearchQuery,
  setProductSearchQuery,
  isTyping,
  setIsTyping,
  products,
  addProductToOrder,
  handleItemSizeChange,
  handleItemQuantityChange,
  handleItemPriceChange,
  removeProductFromOrder,
  handleAddressChange,
  handleNameChange,
  handleEmailChange,
  handlePaymentOptionChange,
  handleEditShippingChange,
  handleDiscountChange,
  handleStatusChange,
}) => {
  return (
    <div>
      <Modal
        open={editModalOpen}
        onClose={closeEditModal}
        aria-labelledby="edit-order-modal"
        aria-describedby="modal-to-edit-order-details"
      >
        <Box sx={modalStyle}>
          <Typography variant="h5" component="h2" gutterBottom>
            Edit Order #{editingOrder?.orderID}
          </Typography>
          <Box component="form" onSubmit={handleEditSubmit}>
            {/* Customer Information Section */}
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
                  value={editFormData.name}
                  onChange={handleNameChange}
                  margin="normal"
                />
                <TextField
                  label="Phone"
                  fullWidth
                  value={editFormData.phone}
                  onChange={handlePhoneChange}
                  margin="normal"
                />
                <TextField
                  label="Email"
                  fullWidth
                  value={editFormData.email}
                  onChange={handleEmailChange}
                  margin="normal"
                />
                <TextField
                  label="Address"
                  fullWidth
                  value={editFormData.address}
                  onChange={handleAddressChange}
                  margin="normal"
                />
                <TextField
                  label="Notes"
                  fullWidth
                  value={editFormData.notes}
                  onChange={handleNotesChange}
                  margin="normal"
                />
              </Box>
            </Box>

            {/* Order Details Section */}
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
                  value={editFormData.paymentOption}
                  onChange={(e) => handlePaymentOptionChange(e.target.value)}
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
                  value={editFormData.shippingOption}
                  onChange={(e) => handleEditShippingChange(e.target.value)}
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
                  value={editFormData.shippingCost}
                  onChange={(e) => handleShippingCostChange(e.target.value)}
                  margin="normal"
                />
                <TextField
                  label="Discount"
                  type="number"
                  fullWidth
                  value={editFormData.discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  margin="normal"
                />
                <TextField
                  label="Advance"
                  type="number"
                  fullWidth
                  value={editFormData.advance}
                  onChange={(e) => handleAdvanceChange(e.target.value)}
                  margin="normal"
                />
                <TextField
                  label="Total"
                  type="number"
                  fullWidth
                  value={editFormData.total}
                  onChange={(e) => handleTotalChange(e.target.value)}
                  margin="normal"
                />
              </Box>
            </Box>

            {/* Consignment Section */}
            <Box sx={{ mb: 3 }}>
              <TextField
                label="Consignment ID"
                fullWidth
                value={editFormData.consignment_id}
                onChange={(e) => handleConsignmentChange(e.target.value)}
                margin="normal"
              />
            </Box>

            {/* Products Section */}
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
                      onClick={() => addProductToOrder(product)}
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

              {isTyping && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Searching...
                </Typography>
              )}

              {/* Selected products */}
              {editFormData.cart.length > 0 ? (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {editFormData.cart.map((item, index) => (
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
                                handleItemSizeChange(index, e.target.value)
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
                                handleItemPriceChange(index, e.target.value)
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
                                handleItemQuantityChange(index, e.target.value)
                              }
                              size="small"
                              sx={{ width: "60px" }}
                            />
                          </TableCell>
                          <TableCell>
                            ৳{(item.price * item.quantity).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => removeProductFromOrder(index)}
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

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 3,
              }}
            >
              <Button variant="outlined" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                sx={{
                  bgcolor: "#5db461",
                  color: "#fff",
                  fontWeight: "600",
                  "&:hover": {
                    bgcolor: "#4a9450",
                  },
                }}
              >
                Save Changes
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default EditOrderModal;
