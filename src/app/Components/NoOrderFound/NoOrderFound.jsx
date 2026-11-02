import { Box, Typography, Button, ButtonGroup } from "@mui/material";
const NoOrderFound = ({ handleStatusFilter, statusFilter }) => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        All Orders
      </Typography>

      {/* Status Filter Buttons */}
      <Box mb={3} display="flex" justifyContent="flex-start">
        <ButtonGroup variant="outlined" aria-label="status filter button group">
          <Button
            onClick={() => handleStatusFilter("all")}
            variant={statusFilter === "all" ? "contained" : "outlined"}
          >
            All
          </Button>
          <Button
            onClick={() => handleStatusFilter("pending")}
            variant={statusFilter === "pending" ? "contained" : "outlined"}
          >
            Pending
          </Button>
          <Button
            onClick={() => handleStatusFilter("shipped")}
            variant={statusFilter === "shipped" ? "contained" : "outlined"}
          >
            Shipped
          </Button>
          <Button
            onClick={() => handleStatusFilter("delivered")}
            variant={statusFilter === "delivered" ? "contained" : "outlined"}
          >
            Delivered
          </Button>
        </ButtonGroup>
      </Box>

      <Typography>No orders found.</Typography>
    </Box>
  );
};

export default NoOrderFound;
