"use client";
import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  CircularProgress,
  Chip,
  Avatar,
  Container,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
} from "@mui/material";
import { useRouter } from "next/navigation";
import useRole from "@/app/utils/useRole";
import { useAuth } from "@/app/services/AuthProvider";
import { MdSearch, MdRefresh } from "react-icons/md";
import { format } from "date-fns";

// A stable avatar color per user (Math.random() here re-colored every row on each render).
const avatarHue = (seed = "") =>
  [...seed].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 360, 0);

const useRedirectAdmin = (user, userLoading, role, roleLoading) => {
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !roleLoading) {
      if (!user || role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [user, userLoading, role, roleLoading, router]);
};

const UserManagementPage = () => {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const { user, loading: userLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  useRedirectAdmin(user, userLoading, role, roleLoading);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (roleFilter) queryParams.append("role", roleFilter);
      queryParams.append("page", page);

      const response = await fetch(
        `/api/user-management?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users);
      setTotalUsers(data.totalUsers);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers().then(() => {
      setTimeout(() => setRefreshing(false), 1000);
    });
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      const response = await fetch("/api/user-management", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, newRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user role");
      }

      // Update local state
      setUsers(
        users.map((user) =>
          user._id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (err) {
      console.error("Error updating user role:", err);
      setError(err.message);
    }
  };

  if (userLoading || roleLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{ bgcolor: alpha(theme.palette.background.default, 0.96) }}
      >
        <CircularProgress
          size={60}
          sx={{ color: theme.palette.primary.main }}
        />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pb: 8 }}>
      <Box sx={{ py: 4 }}>
        {/* Header Section */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: theme.palette.text.primary,
                letterSpacing: "-0.5px",
              }}
            >
              User Management
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: theme.palette.text.secondary,
                mt: 0.5,
              }}
            >
              Manage user roles and permissions ({totalUsers} total users)
            </Typography>
          </Box>
          <Tooltip title="Refresh data">
            <IconButton
              onClick={handleRefresh}
              color="primary"
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
            >
              <MdRefresh
                sx={{
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Search and Filter Section */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              label="Search Users"
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <MdSearch style={{ marginRight: 8 }} />,
              }}
              sx={{
                flex: 1,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                },
              }}
            />
            <FormControl
              sx={{
                minWidth: 200,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                },
              }}
            >
              <InputLabel>Filter by Role</InputLabel>
              <Select
                value={roleFilter}
                label="Filter by Role"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="">All Roles</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
                <MenuItem value="customer">Customer</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleSearch}
              sx={{
                bgcolor: theme.palette.primary.main,
                color: "#fff",
                fontWeight: 600,
                borderRadius: 1.5,
                px: 3,
                height: { sm: "56px" },
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                "&:hover": {
                  bgcolor: theme.palette.primary.dark,
                  boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
                },
              }}
            >
              Search
            </Button>
          </Box>
        </Paper>

        {/* Users Table */}
        {loading && !refreshing ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 8 }}>
            <CircularProgress
              size={50}
              sx={{ color: theme.palette.primary.main }}
            />
          </Box>
        ) : error ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              bgcolor: alpha(theme.palette.error.main, 0.05),
              borderRadius: 2,
              border: `1px solid ${theme.palette.error.light}`,
            }}
          >
            <Typography color="error.main" fontWeight={500}>
              {error}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={fetchUsers}
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
          </Paper>
        ) : users.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: "center",
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.info.main, 0.05),
            }}
          >
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              No users found matching your criteria
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("");
                setPage(1);
                fetchUsers();
              }}
            >
              Clear Filters
            </Button>
          </Paper>
        ) : (
          <>
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)",
                overflow: "hidden",
                mb: 3,
              }}
            >
              <Table>
                <TableHead
                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}
                >
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>
                      Joined
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user._id}
                      sx={{
                        "&:nth-of-type(even)": {
                          bgcolor: alpha(theme.palette.background.paper, 0.3),
                        },
                        "&:hover": {
                          bgcolor: alpha(theme.palette.primary.main, 0.03),
                        },
                      }}
                    >
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Avatar
                            sx={{
                              bgcolor: `hsl(${avatarHue(user.email)}, 70%, 60%)`,
                              width: 36,
                              height: 36,
                              mr: 1.5,
                              fontSize: "1rem",
                            }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body1" fontWeight={500}>
                            {user.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Chip
                          label={user.role}
                          size="small"
                          sx={{
                            bgcolor: alpha(
                              user.role === "admin"
                                ? theme.palette.error.main
                                : user.role === "moderator"
                                ? theme.palette.warning.main
                                : theme.palette.success.main,
                              0.1
                            ),
                            color:
                              user.role === "admin"
                                ? theme.palette.error.main
                                : user.role === "moderator"
                                ? theme.palette.warning.main
                                : theme.palette.success.main,
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {format(new Date(user.createdAt), "MMM d, yyyy")}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleUpdate(user._id, e.target.value)
                            }
                            sx={{
                              borderRadius: 1,
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: alpha(
                                  theme.palette.primary.main,
                                  0.2
                                ),
                              },
                            }}
                          >
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="moderator">Moderator</MenuItem>
                            <MenuItem value="customer">Customer</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: 3,
                mb: 2,
              }}
            >
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
                sx={{
                  "& .MuiPaginationItem-root": {
                    borderRadius: 1,
                  },
                }}
              />
            </Box>
          </>
        )}
      </Box>

      {/* Custom CSS for animations */}
      <style jsx global>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Container>
  );
};

export default UserManagementPage;
