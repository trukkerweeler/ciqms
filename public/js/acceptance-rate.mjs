import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

const DEBUG = new URLSearchParams(window.location.search).get("debug") === "1";

function debugLog(...args) {
  if (DEBUG) {
    console.log("[acceptance-rate.mjs]", ...args);
  }
}

// Load header and footer
await loadHeaderFooter();
debugLog("Header/footer loaded");

// Initialize page
const apiUrl = await getApiUrl();
debugLog("Endpoint base:", apiUrl);

let chart = null;
let currentReportType = "vpp"; // Default report type

// Set up radio button listeners
function setupReportTypeListeners() {
  const radioButtons = document.querySelectorAll('input[name="reportType"]');
  radioButtons.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      currentReportType = e.target.value;
      debugLog("Report type changed to:", currentReportType);
      fetchAcceptanceRateData();
    });
  });
}

async function fetchAcceptanceRateData() {
  const endpoint = `${apiUrl}/acceptance-rate?type=${currentReportType}`;
  debugLog("Starting fetch from", endpoint);
  try {
    const response = await fetch(endpoint);
    debugLog("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      debugLog("HTTP error body:", errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    debugLog("Parsed data:", data);

    if (data.error) {
      debugLog("API returned error:", data.error);
      showError(`${data.error}${data.details ? ": " + data.details : ""}`);
      return;
    }

    debugLog("Data validation passed, rendering...");
    renderChart(data);
    renderTable(data);
  } catch (error) {
    debugLog("Error fetching acceptance rate data:", error);
    showError("Failed to load acceptance rate data: " + error.message);
  }
}

function renderChart(data) {
  debugLog("renderChart called with data:", data);

  const ctx = document.getElementById("chart-placeholder");

  if (!ctx) {
    console.error("[acceptance-rate.mjs] Chart container not found");
    return;
  }

  // Clear the placeholder
  ctx.innerHTML = "";
  ctx.className = "";

  // Create canvas element
  const canvas = document.createElement("canvas");
  canvas.id = "acceptanceRateChart";
  ctx.appendChild(canvas);

  // Extract data for chart
  const months = data.data.map((item) => item.monthName);
  const rates = data.data.map((item) => item.acceptanceRate);

  debugLog("Chart months:", months.join(", "));
  debugLog("Chart rates:", rates.join(", "));

  // Determine chart title based on report type
  const reportTypeLabel =
    data.reportType === "vpp"
      ? "Receiving inspection (VPP)"
      : "Final inspection (FIN - Jobs Closed)";

  try {
    // Create line chart
    chart = new Chart(ctx.querySelector("canvas"), {
      type: "line",
      data: {
        labels: months,
        datasets: [
          {
            label: `Acceptance Rate (%) - ${data.year}`,
            data: rates,
            borderColor: "rgb(75, 192, 75)",
            backgroundColor: "rgba(75, 192, 75, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: "rgb(75, 192, 75)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "top",
            labels: {
              font: {
                size: 12,
              },
              usePointStyle: true,
              padding: 20,
            },
          },
          title: {
            display: true,
            text: `Acceptance Rate Report\n${reportTypeLabel} - ${data.year}`,
            font: {
              size: 14,
              weight: "bold",
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function (value) {
                return value + "%";
              },
            },
            title: {
              display: true,
              text: "Acceptance Rate (%)",
            },
          },
          x: {
            title: {
              display: true,
              text: "Month",
            },
          },
        },
      },
    });
    debugLog("Chart rendered successfully");
  } catch (err) {
    console.error("[acceptance-rate.mjs] Error rendering chart:", err);
    showError(`Failed to render chart: ${err.message}`);
  }
}

function renderTable(data) {
  debugLog(`renderTable called with ${data.data.length} rows`);

  const tbody = document.getElementById("table-body");
  const ncmHeader = document.getElementById("ncm-header");

  if (!tbody) {
    console.error("[acceptance-rate.mjs] Table body not found");
    return;
  }

  // Update NCM header based on report type
  if (ncmHeader) {
    if (data.reportType === "vpp") {
      ncmHeader.textContent = "VPP NCMs";
    } else if (data.reportType === "fin") {
      ncmHeader.textContent = "FIN NCMs";
    }
  }

  // Clear existing rows
  tbody.innerHTML = "";

  // Add row for each month
  data.data.forEach((item) => {
    const row = document.createElement("tr");

    // Determine which NCM field to use
    const ncmField = data.reportType === "vpp" ? "vppNCMs" : "finNCMs";
    const ncmCount = item[ncmField] || 0;

    row.innerHTML = `
      <td>${item.monthName}</td>
      <td>${item.receipts.toLocaleString()}</td>
      <td>${ncmCount}</td>
      <td>${item.acceptanceRate.toFixed(2)}%</td>
    `;
    tbody.appendChild(row);
  });

  debugLog(`Table rendered with ${data.data.length} rows`);
}

function showError(message) {
  const errorDiv = document.getElementById("error-message");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  }
  const placeholder = document.getElementById("chart-placeholder");
  if (placeholder) {
    placeholder.style.display = "none";
  }
}

// Load data when page is ready
window.addEventListener("DOMContentLoaded", () => {
  debugLog("DOMContentLoaded fired");
  setupReportTypeListeners();
  fetchAcceptanceRateData();
});

// Also check if page is already loaded
if (document.readyState === "loading") {
  debugLog("Page still loading");
} else {
  debugLog("Page already loaded");
  setupReportTypeListeners();
  fetchAcceptanceRateData();
}
