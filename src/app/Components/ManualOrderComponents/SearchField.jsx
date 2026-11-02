import { Box, TextField } from "@mui/material";
import React from "react";

const SearchField = ({ handleNumberSearch, setPhoneInput, phoneInput }) => {
  return (
    <Box mb={3} display="flex" alignItems="center">
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
    </Box>
  );
};

export default SearchField;
