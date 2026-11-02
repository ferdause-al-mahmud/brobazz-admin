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
  Button,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Alert,
  Chip,
  Avatar,
  Divider,
  Container,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { format, subDays } from "date-fns";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";

import { useRouter } from "next/navigation";
import useRole from "@/app/utils/useRole";
import { useAuth } from "@/app/services/AuthProvider";
import {
  MdFilterAlt,
  MdInfoOutline,
  MdInventory,
  MdPeopleAlt,
} from "react-icons/md";
import { FcRefresh } from "react-icons/fc";
import { FaDownload, FaShoppingCart } from "react-icons/fa";
import { FiTrendingUp } from "react-icons/fi";

const useRedirectModerator = (user, userLoading, role, roleLoading) => {
  const router = useRouter();

  useEffect(() => {
    // Only run when both user and role are fully loaded
    if (!userLoading && !roleLoading) {
      if (user && role === "moderator") {
        router.push("/dashboard");
      }
    }
  }, [user, userLoading, role, roleLoading, router]);
};

const ModeratorTrackingPage = () => {
  const theme = useTheme();
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [moderatorData, setModeratorData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { user, loading: userLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  useRedirectModerator(user, userLoading, role, roleLoading);

  const fetchModeratorData = async () => {
    setLoading(true);
    setError(null);

    try {
      const formattedStartDate = format(startDate, "yyyy-MM-dd");
      const formattedEndDate = format(endDate, "yyyy-MM-dd");

      const response = await fetch(
        `/api/moderator-tracking?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch moderator data");
      }

      const data = await response.json();
      setModeratorData(data.moderators);
      setTotalOrders(data.totalOrders);
      setTotalProducts(data.totalProducts);
    } catch (err) {
      console.error("Error fetching moderator data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModeratorData();
  }, []);

  const handleFilter = () => {
    fetchModeratorData();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchModeratorData().then(() => {
      setTimeout(() => setRefreshing(false), 1000);
    });
  };

  const handleExportData = () => {
    // Export functionality would go here
    alert("Export functionality would be implemented here");
  };

  // Get average products per moderator
  const averageProducts = moderatorData.length
    ? Math.round(totalProducts / moderatorData.length)
    : 0;

  // Prepare data for charts
  const chartData = moderatorData.map((mod) => ({
    name: mod.email.split("@")[0],
    orders: mod.orderCount,
    products: mod.productCount,
  }));

  const pieData = moderatorData.map((mod) => ({
    id: mod.email.split("@")[0],
    value: mod.productCount,
    label: mod.email.split("@")[0],
  }));

  // Calculate performance rates for each moderator
  const getPerformanceColor = (count, average) => {
    if (count >= average * 1.25) return theme.palette.success.main;
    if (count >= average * 0.75) return theme.palette.info.main;
    return theme.palette.warning.main;
  };

  const getPerformanceLabel = (count, average) => {
    if (count >= average * 1.25) return "High";
    if (count >= average * 0.75) return "Average";
    return "Low";
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
              Moderator Analytics
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                color: theme.palette.text.secondary,
                mt: 0.5,
              }}
            >
              Track and analyze moderator performance metrics
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
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
                <FcRefresh
                  sx={{
                    animation: refreshing ? "spin 1s linear infinite" : "none",
                  }}
                />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export data">
              <IconButton
                onClick={handleExportData}
                color="primary"
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                <FaDownload />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Info Alert */}
        <Alert
          severity="info"
          variant="outlined"
          icon={<MdInfoOutline />}
          sx={{
            mb: 4,
            borderRadius: 2,
            "& .MuiAlert-icon": {
              alignItems: "center",
            },
          }}
        >
          This dashboard only displays orders with an assigned moderator. Orders
          created through other methods are not included in these statistics.
        </Alert>

        {/* Date Range Filter */}
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
              alignItems: "center",
              mb: 2,
            }}
          >
            <MdFilterAlt sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6" fontWeight={600}>
              Date Range Filter
            </Typography>
          </Box>
          <Divider sx={{ mb: 3 }} />
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                sx={{
                  flex: 1,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                  },
                }}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                sx={{
                  flex: 1,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                  },
                }}
              />
            </LocalizationProvider>
            <Button
              variant="contained"
              onClick={handleFilter}
              startIcon={<MdFilterAlt />}
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
              Apply Filter
            </Button>
          </Box>
        </Paper>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                height: "100%",
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)",
                transition:
                  "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 24px 0 rgba(0,0,0,0.1)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    fontWeight={500}
                  >
                    Total Moderators
                  </Typography>
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      width: 48,
                      height: 48,
                    }}
                  >
                    <MdPeopleAlt />
                  </Avatar>
                </Box>
                <Typography variant="h3" fontWeight={700}>
                  {moderatorData.length}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                  <FiTrendingUp
                    sx={{
                      fontSize: 16,
                      color: theme.palette.success.main,
                      mr: 0.5,
                    }}
                  />
                  <Typography variant="body2" color="success.main">
                    Active team
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                height: "100%",
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)",
                transition:
                  "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 24px 0 rgba(0,0,0,0.1)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    fontWeight={500}
                  >
                    Total Orders
                  </Typography>
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.secondary.main, 0.1),
                      color: theme.palette.secondary.main,
                      width: 48,
                      height: 48,
                    }}
                  >
                    <FaShoppingCart />
                  </Avatar>
                </Box>
                <Typography variant="h3" fontWeight={700}>
                  {totalOrders}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                  <FiTrendingUp
                    sx={{
                      fontSize: 16,
                      color: theme.palette.success.main,
                      mr: 0.5,
                    }}
                  />
                  <Typography variant="body2" color="success.main">
                    {totalOrders
                      ? `${Math.round(
                          totalOrders / moderatorData.length
                        )} per moderator`
                      : "No data"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 2,
                height: "100%",
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)",
                transition:
                  "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 8px 24px 0 rgba(0,0,0,0.1)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    fontWeight={500}
                  >
                    Total Products
                  </Typography>
                  <Avatar
                    sx={{
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main,
                      width: 48,
                      height: 48,
                    }}
                  >
                    <MdInventory />
                  </Avatar>
                </Box>
                <Typography variant="h3" fontWeight={700}>
                  {totalProducts}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                  <FiTrendingUp
                    sx={{
                      fontSize: 16,
                      color: theme.palette.success.main,
                      mr: 0.5,
                    }}
                  />
                  <Typography variant="body2" color="success.main">
                    {averageProducts
                      ? `${averageProducts} per moderator`
                      : "No data"}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Table Section */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h5"
            sx={{
              mb: 1,
              fontWeight: 600,
              color: theme.palette.text.primary,
            }}
          >
            Moderator Activity Details
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Detailed breakdown of moderator performance metrics
          </Typography>
        </Box>

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
              onClick={fetchModeratorData}
              sx={{ mt: 2 }}
            >
              Retry
            </Button>
          </Paper>
        ) : moderatorData.length === 0 ? (
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
              No moderator data found for the selected period
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {
                setStartDate(subDays(new Date(), 90));
                setEndDate(new Date());
                fetchModeratorData();
              }}
            >
              Try a broader date range
            </Button>
          </Paper>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)",
              overflow: "hidden",
            }}
          >
            <Table>
              <TableHead
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}
              >
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>
                    Moderator
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>
                    Orders Created
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>
                    Products Added
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>
                    Last Activity
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>
                    Performance
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {moderatorData.map((moderator, index) => (
                  <TableRow
                    key={moderator.email}
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
                            bgcolor: `hsl(${index * 40}, 70%, 60%)`,
                            width: 36,
                            height: 36,
                            mr: 1.5,
                            fontSize: "1rem",
                          }}
                        >
                          {moderator.email.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            {moderator.email.split("@")[0]}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {moderator.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body1" fontWeight={500}>
                        {moderator.orderCount.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {totalOrders > 0
                          ? `${Math.round(
                              (moderator.orderCount / totalOrders) * 100
                            )}% of total`
                          : "0% of total"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body1" fontWeight={500}>
                        {moderator.productCount.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {totalProducts > 0
                          ? `${Math.round(
                              (moderator.productCount / totalProducts) * 100
                            )}% of total`
                          : "0% of total"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      {moderator.lastActivity ? (
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            {format(
                              new Date(moderator.lastActivity),
                              "MMM d, yyyy"
                            )}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {format(new Date(moderator.lastActivity), "h:mm a")}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No activity recorded
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ mb: 1 }}>
                        <Chip
                          label={getPerformanceLabel(
                            moderator.productCount,
                            averageProducts
                          )}
                          size="small"
                          sx={{
                            bgcolor: alpha(
                              getPerformanceColor(
                                moderator.productCount,
                                averageProducts
                              ),
                              0.1
                            ),
                            color: getPerformanceColor(
                              moderator.productCount,
                              averageProducts
                            ),
                            fontWeight: 500,
                          }}
                        />
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Box
                          sx={{
                            width: 120,
                            bgcolor: alpha(theme.palette.divider, 0.5),
                            borderRadius: 1,
                            height: 6,
                          }}
                        >
                          <Box
                            sx={{
                              width: `${Math.min(
                                (moderator.productCount /
                                  Math.max(averageProducts * 2, 1)) *
                                  100,
                                100
                              )}%`,
                              bgcolor: getPerformanceColor(
                                moderator.productCount,
                                averageProducts
                              ),
                              height: "100%",
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                        <Typography variant="body2" fontWeight={500}>
                          {Math.round(
                            (moderator.productCount / (totalProducts || 1)) *
                              100
                          )}
                          %
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Charts Section */}
        {moderatorData.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h5"
              sx={{
                mb: 3,
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
              Performance Analytics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: 450,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)",
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    Moderator Activity Comparison
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Comparing orders processed and products added by each
                    moderator
                  </Typography>
                  <BarChart
                    series={[
                      {
                        dataKey: "orders",
                        label: "Orders",
                        color: theme.palette.secondary.main,
                        valueFormatter: (value) => `${value} orders`,
                      },
                      {
                        dataKey: "products",
                        label: "Products",
                        color: theme.palette.primary.main,
                        valueFormatter: (value) => `${value} products`,
                      },
                    ]}
                    dataset={chartData}
                    xAxis={[
                      {
                        scaleType: "band",
                        dataKey: "name",
                        tickLabelStyle: {
                          angle: 0,
                          textAnchor: "middle",
                        },
                      },
                    ]}
                    height={350}
                    margin={{
                      left: 40,
                      right: 40,
                      top: 10,
                      bottom: 30,
                    }}
                    sx={{
                      ".MuiChartsAxis-left .MuiChartsAxis-line": {
                        stroke: theme.palette.divider,
                      },
                      ".MuiChartsAxis-bottom .MuiChartsAxis-line": {
                        stroke: theme.palette.divider,
                      },
                    }}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: 450,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)",
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    Product Distribution
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Distribution of product additions across moderators
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: 350,
                    }}
                  >
                    <PieChart
                      series={[
                        {
                          data: pieData,
                          innerRadius: 50,
                          outerRadius: 120,
                          paddingAngle: 2,
                          cornerRadius: 4,
                          startAngle: -90,
                          endAngle: 270,
                          highlightScope: {
                            faded: "global",
                            highlighted: "item",
                          },
                          faded: {
                            innerRadius: 48,
                            outerRadius: 122,
                            color: "gray",
                          },
                        },
                      ]}
                      height={350}
                      sx={{
                        '[data-testid="PieArc"]': {
                          stroke: theme.palette.background.paper,
                          strokeWidth: 2,
                        },
                      }}
                    />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
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

export default ModeratorTrackingPage;
