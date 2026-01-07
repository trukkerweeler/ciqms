import { loadHeaderFooter, myport } from "./utils.mjs";

loadHeaderFooter();
const port = myport();

let trendChartInstance = null; // Global chart instance

// Month labels for chart
const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Handles Order Booking details fetch and UI rendering
window.addEventListener("DOMContentLoaded", () => {
  const yearPicker = document.getElementById("yearPicker");
  const bookingDetailsTable = document.getElementById("bookingDetailsTable");

  let currentMonth = new Date().getMonth() + 1; // Track selected month

  // Load trend chart when year changes
  yearPicker.addEventListener("change", async () => {
    const year = yearPicker.value;
    if (!year) return;
    await loadAndRenderTrendChart(year);
  });

  // Fetch detail data for a given month/year
  async function fetchBookingDetails(year, month) {
    if (!year || !month) return;

    // Fetch booking details
    const detailsResponse = await fetch("/bookingmonthly/category-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
    });
    if (!detailsResponse.ok) {
      bookingDetailsTable.innerHTML =
        '<tr><td colspan="4">Error loading booking details</td></tr>';
      return;
    }
    const detailsData = await detailsResponse.json();
    renderBookingDetails(detailsData);
  }

  function renderBookingDetails(data) {
    if (!data || !data.length) {
      bookingDetailsTable.innerHTML =
        '<tr><td colspan="4">No data found</td></tr>';
      return;
    }

    let html = `<tr><th>Category</th><th>Value</th><th>Orders</th><th>Avg Order Value</th></tr>`;

    let grandTotal = 0;
    let totalOrders = 0;

    for (const row of data) {
      const orderValue = Number(row.ORDER_VALUE);
      const orderCount = Number(row.ORDER_COUNT);
      const avgValue = orderCount > 0 ? orderValue / orderCount : 0;

      grandTotal += orderValue;
      totalOrders += orderCount;

      html += `<tr>
        <td><a href="#" class="category-link" data-category="${row.CATEGORY}">${
        row.CATEGORY
      }</a></td>
        <td style="font-weight:bold">${orderValue.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}</td>
        <td>${orderCount}</td>
        <td>${avgValue.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}</td>
      </tr>`;
    }

    // Add grand total
    const avgGrandTotal = totalOrders > 0 ? grandTotal / totalOrders : 0;
    html += `<tr style="background:#e0e8ff;font-weight:bold;font-size:1.1em">
      <td style="text-align:right">TOTAL:</td>
      <td style="color:green">${grandTotal.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
      <td>${totalOrders}</td>
      <td>${avgGrandTotal.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
    </tr>`;

    bookingDetailsTable.innerHTML = html;

    // Attach click handlers to category links
    document.querySelectorAll(".category-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const category = e.target.dataset.category;
        showCategoryDrillDown(category);
      });
    });
  }

  // Function to show drill-down dialog for a category
  async function showCategoryDrillDown(category) {
    const year = yearPicker.value;
    const month = currentMonth;

    const drillDownDialog = document.getElementById("drillDownDialog");
    const drillDownTable = document.getElementById("drillDownTable");
    const drillDownTitle = document.getElementById("drillDownTitle");

    drillDownTitle.textContent = `Orders for ${category}`;
    drillDownTable.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    drillDownDialog.showModal();

    try {
      const response = await fetch("/bookingmonthly/category-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, category }),
      });

      if (!response.ok) {
        drillDownTable.innerHTML =
          '<tr><td colspan="5">Error loading orders</td></tr>';
        return;
      }

      const orders = await response.json();
      renderDrillDownTable(orders);
    } catch (error) {
      console.error("Error fetching category orders:", error);
      drillDownTable.innerHTML =
        '<tr><td colspan="5">Error loading orders</td></tr>';
    }
  }

  function renderDrillDownTable(orders) {
    const drillDownTable = document.getElementById("drillDownTable");

    if (!orders || !orders.length) {
      drillDownTable.innerHTML =
        '<tr><td colspan="5">No orders found</td></tr>';
      return;
    }

    let html = `<tr>
      <th>Order Number</th>
      <th>Date</th>
      <th>Customer</th>
      <th>Description</th>
      <th>Order Value</th>
    </tr>`;

    let total = 0;
    for (const order of orders) {
      const formattedDate = new Date(order.ORDER_DATE).toLocaleDateString();
      const amount = Number(order.ORDER_VALUE);
      total += amount;

      html += `<tr>
        <td>${order.ORDER_NUMBER || ""}</td>
        <td>${formattedDate}</td>
        <td>${order.CUSTOMER || ""}</td>
        <td>${order.DESCRIPTION || ""}</td>
        <td style="font-weight:bold">${amount.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}</td>
      </tr>`;
    }

    // Add total row
    html += `<tr style="background:#eef;font-weight:bold">
      <td colspan="4" style="text-align:right">Total:</td>
      <td>${total.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
    </tr>`;

    drillDownTable.innerHTML = html;
  }

  // Close drill-down dialog
  document.getElementById("closeDrillDownBtn").addEventListener("click", () => {
    document.getElementById("drillDownDialog").close();
  });

  // Close drill-down dialog on outside click
  const drillDownDialog = document.getElementById("drillDownDialog");
  drillDownDialog.addEventListener("click", (e) => {
    if (e.target === drillDownDialog) {
      drillDownDialog.close();
    }
  });

  // Load and render yearly trend chart
  async function loadAndRenderTrendChart(year) {
    try {
      const response = await fetch("/bookingmonthly/yearly-trend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });

      if (!response.ok) {
        console.error("Error loading yearly trend data");
        return;
      }

      const trendData = await response.json();
      renderTrendChart(trendData);
    } catch (error) {
      console.error("Error fetching yearly trend data:", error);
    }
  }

  // Render Chart.js trend chart
  function renderTrendChart(data) {
    const chartCanvas = document.getElementById("trendChart");
    if (!chartCanvas) return;

    // Extract data for each metric
    const bookingValueData = data.map((m) => m.bookingValue);
    const orderCountData = data.map((m) => m.orderCount);

    // Destroy existing chart if it exists
    if (trendChartInstance) {
      trendChartInstance.destroy();
    }

    // Create new chart
    const ctx = chartCanvas.getContext("2d");
    trendChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: "Booking Value",
            data: bookingValueData,
            borderColor: "rgb(75, 192, 75)",
            backgroundColor: "rgba(75, 192, 75, 0.1)",
            borderWidth: 2,
            yAxisID: "y",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
          },
          {
            label: "Order Count",
            data: orderCountData,
            borderColor: "rgb(54, 108, 255)",
            backgroundColor: "rgba(54, 108, 255, 0.1)",
            borderWidth: 2,
            yAxisID: "y1",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const monthIndex = elements[0].index;
            const selectedMonth = monthIndex + 1;
            currentMonth = selectedMonth;
            const year = yearPicker.value;
            fetchBookingDetails(year, selectedMonth);
            // Scroll to detail section
            setTimeout(() => {
              document
                .querySelector("h2")
                .scrollIntoView({ behavior: "smooth" });
            }, 100);
          }
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0,0,0,0.8)",
            padding: 12,
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  if (context.dataset.yAxisID === "y1") {
                    label += context.parsed.y.toFixed(0) + " orders";
                  } else {
                    label += "$" + context.parsed.y.toLocaleString();
                  }
                }
                return label;
              },
            },
          },
        },
        scales: {
          y: {
            type: "linear",
            display: true,
            position: "left",
            title: {
              display: true,
              text: "Booking Value ($)",
            },
            ticks: {
              callback: function (value) {
                return "$" + (value / 1000).toFixed(0) + "K";
              },
            },
            grid: {
              color: function (context) {
                if (context.tick.value === 0) {
                  return "rgba(0, 0, 0, 0.8)";
                }
                return "rgba(0, 0, 0, 0.1)";
              },
              lineWidth: function (context) {
                if (context.tick.value === 0) {
                  return 3;
                }
                return 1;
              },
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            title: {
              display: true,
              text: "Order Count",
            },
            ticks: {
              callback: function (value) {
                return value.toFixed(0) + " orders";
              },
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    });
  }

  // Initial load for current month and year
  const today = new Date();
  currentMonth = today.getMonth() + 1;
  yearPicker.value = today.getFullYear();
  loadAndRenderTrendChart(today.getFullYear()).catch(console.error);
  fetchBookingDetails(today.getFullYear(), currentMonth);
});
