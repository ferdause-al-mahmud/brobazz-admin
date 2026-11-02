import { Box, Button, ButtonGroup } from "@mui/material";
import React from "react";

const StatusFilter = ({ handleStatusFilter, statusFilter }) => {
  return (
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
          sx={{ bgcolor: statusFilter === "pending" ? "#FFC107" : "inherit" }}
        >
          Pending
        </Button>
        <Button
          onClick={() => handleStatusFilter("shipped")}
          variant={statusFilter === "shipped" ? "contained" : "outlined"}
          sx={{ bgcolor: statusFilter === "shipped" ? "#90CAF9" : "inherit" }}
        >
          Shipped
        </Button>
        <Button
          onClick={() => handleStatusFilter("delivered")}
          variant={statusFilter === "delivered" ? "contained" : "outlined"}
          sx={{
            bgcolor: statusFilter === "delivered" ? "#66BB6A" : "inherit",
          }}
        >
          Delivered
        </Button>
      </ButtonGroup>
    </Box>
  );
};

export default StatusFilter;
