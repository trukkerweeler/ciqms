import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

let allSuppliers = [];
let currentChart = null;

/**
 * Fetch top 10 suppliers data
 */
async function fetchTopSuppliers() {
  try {
    const apiUrl = await getApiUrl();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

    const response = await fetch(`${apiUrl}/supplier-scorecard/top-suppliers`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      console.error("[supplier-scorecard] Server error:", data.error);
      showError("topSuppliersContainer", data.error);
      return;
    }

    allSuppliers = data;
    renderTopSuppliersTable(data);
    populateSupplierSelect(data);
  } catch (error) {
    console.error("[supplier-scorecard] Error fetching suppliers:", error);
    const errorMsg =
      error.name === "AbortError"
        ? "Request timeout - database query took too long"
        : error.message;
    showError(
      "topSuppliersContainer",
      `Failed to load supplier data: ${errorMsg}`,
    );
  }
}

/**
 * Render top suppliers table
 */
function renderTopSuppliersTable(data) {
  const container = document.getElementById("topSuppliersContainer");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.innerHTML = "<p class='error'>No supplier data available.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "data-table";

  // Create header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const headers = [
    "Rank",
    "Vendor Code",
    "Total Spend",
    "PO Count",
    "Line Count",
    "On-Time %",
    "Weighted Score",
  ];

  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement("tbody");
  data.forEach((item, index) => {
    const row = document.createElement("tr");

    // Rank
    const rankCell = document.createElement("td");
    rankCell.textContent = index + 1;
    row.appendChild(rankCell);

    // Vendor Code
    const vendorCell = document.createElement("td");
    vendorCell.textContent = item.VENDOR || "N/A";
    if (item.NAME_VENDOR) {
      vendorCell.title = item.NAME_VENDOR;
      vendorCell.style.cursor = "help";
    }
    row.appendChild(vendorCell);

    // Total Spend
    const spendCell = document.createElement("td");
    const spend = parseFloat(item.TOTAL_SPEND) || 0;
    spendCell.textContent = `$${spend.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    spendCell.className = "numeric";
    row.appendChild(spendCell);

    // PO Count
    const poCountCell = document.createElement("td");
    poCountCell.textContent = item.PO_COUNT || "0";
    poCountCell.className = "numeric";
    row.appendChild(poCountCell);

    // Line Count
    const lineCountCell = document.createElement("td");
    lineCountCell.textContent = item.LINE_COUNT || "0";
    lineCountCell.className = "numeric";
    row.appendChild(lineCountCell);

    // On-Time %
    const onTimeCell = document.createElement("td");
    const onTimePercent = parseFloat(item.ON_TIME_PERCENT) || 0;
    onTimeCell.textContent = onTimePercent.toFixed(1) + "%";
    onTimeCell.className = "numeric";
    row.appendChild(onTimeCell);

    // Weighted Score
    const scoreCell = document.createElement("td");
    const score = parseFloat(item.WEIGHTED_SCORE) || 0;
    scoreCell.textContent = score.toFixed(3);
    scoreCell.className = "numeric score";
    row.appendChild(scoreCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

/**
 * Populate supplier dropdown
 */
function populateSupplierSelect(suppliers) {
  const select = document.getElementById("supplierSelect");

  // Clear existing options except the first placeholder
  while (select.options.length > 1) {
    select.remove(1);
  }

  suppliers.forEach((supplier) => {
    const option = document.createElement("option");
    option.value = supplier.VENDOR;
    const vendorDisplay = supplier.NAME_VENDOR
      ? `${supplier.VENDOR} - ${supplier.NAME_VENDOR}`
      : supplier.VENDOR;
    option.textContent = vendorDisplay;
    select.appendChild(option);
  });

  select.addEventListener("change", (e) => {
    if (e.target.value) {
      fetchSupplierTrend(e.target.value);
    } else {
      hideTrendChart();
    }
  });
}

/**
 * Fetch supplier quarterly trend data
 */
async function fetchSupplierTrend(vendorCode) {
  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(
      `${apiUrl}/supplier-scorecard/trend?vendor=${encodeURIComponent(vendorCode)}`,
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const rawData = await response.json();

    if (rawData.error) {
      showError("chartContainer", rawData.error);
      return;
    }

    // Process raw PO data into quarterly trends
    const trendArray = buildTrend(rawData);

    // Transform to chart format
    const trendData = {
      quarters: trendArray.map((d) => d.quarter),
      onTimePercentages: trendArray.map((d) => d.onTimePercent),
      posCount: trendArray.map((d) => d.poCount),
    };

    renderTrendChart(trendData, vendorCode);
  } catch (error) {
    console.error("[supplier-scorecard] Error fetching trend:", error);
    showError("chartContainer", "Failed to load trend data");
  }
}

/**
 * Get filter start date: 2 years back from the most recent completed quarter end
 */
function getFilterStartDate() {
  const today = new Date();
  const month = today.getMonth(); // 0-11
  const year = today.getFullYear();

  let quarterEndDate;

  // Find the most recent completed quarter end
  if (month < 3) {
    // We're in Q1, so most recent quarter end is Q4 of previous year
    quarterEndDate = new Date(year - 1, 11, 31); // Dec 31
  } else if (month < 6) {
    // We're in Q2, so most recent quarter end is Q1
    quarterEndDate = new Date(year, 2, 31); // Mar 31
  } else if (month < 9) {
    // We're in Q3, so most recent quarter end is Q2
    quarterEndDate = new Date(year, 5, 30); // Jun 30
  } else {
    // We're in Q4, so most recent quarter end is Q3
    quarterEndDate = new Date(year, 8, 30); // Sep 30
  }

  // Go back 2 years from that quarter end
  const twoYearsBack = new Date(quarterEndDate);
  twoYearsBack.setFullYear(twoYearsBack.getFullYear() - 2);

  return twoYearsBack;
}

/**
 * Build quarterly trend from raw PO records
 */
function buildTrend(rawRows) {
  // Collapse to PO-level first
  const poMap = new Map();

  for (const row of rawRows) {
    const po = row.po;

    if (!poMap.has(po)) {
      poMap.set(po, {
        po,
        dueDate: row.dueDate,
        receivedDate: row.receivedDate,
      });
    } else {
      const existing = poMap.get(po);

      // Keep the latest due date
      if (row.dueDate > existing.dueDate) {
        existing.dueDate = row.dueDate;
      }

      // Keep the latest received date
      if (row.receivedDate > existing.receivedDate) {
        existing.receivedDate = row.receivedDate;
      }
    }
  }

  // Convert PO-level map to array
  const poRows = Array.from(poMap.values());

  // Get filter dates
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight for fair comparison

  const filterStartDate = getFilterStartDate();
  filterStartDate.setHours(0, 0, 0, 0);

  const quarterMap = new Map();

  for (const row of poRows) {
    const due = new Date(row.dueDate);

    // Skip POs due in the future
    if (due > today) {
      continue;
    }

    // Skip POs older than 2 years from most recent quarter end
    if (due < filterStartDate) {
      continue;
    }

    const year = due.getFullYear();
    const quarter = Math.floor(due.getMonth() / 3) + 1;

    const key = `${year}-Q${quarter}`;

    if (!quarterMap.has(key)) {
      quarterMap.set(key, {
        quarter: key,
        poCount: 0,
        onTimeCount: 0,
      });
    }

    const q = quarterMap.get(key);

    q.poCount++;

    // On-time check
    if (row.receivedDate && row.receivedDate <= row.dueDate) {
      q.onTimeCount++;
    }
  }

  // Convert to final array
  const trend = Array.from(quarterMap.values())
    .map((q) => ({
      quarter: q.quarter,
      poCount: q.poCount,
      onTimePercent: q.poCount === 0 ? 0 : (q.onTimeCount / q.poCount) * 100,
    }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter));

  return trend;
}

/**
 * Render quarterly trend chart
 */
function renderTrendChart(data, vendorCode) {
  const chartDisplay = document.getElementById("chartDisplay");
  const placeholder = document.getElementById("chartPlaceholder");
  const chartCanvas = document.getElementById("supplierTrendChart");

  chartDisplay.style.display = "block";
  chartDisplay.classList.add("active");
  placeholder.style.display = "none";

  // Destroy existing chart if any
  if (currentChart) {
    currentChart.destroy();
  }

  currentChart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels: data.quarters,
      datasets: [
        {
          label: `${vendorCode} - On-Time Delivery %`,
          data: data.onTimePercentages,
          borderColor: "#1a472a",
          backgroundColor: "rgba(26, 71, 42, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointBackgroundColor: "#1a472a",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: "#2d6a47",
          yAxisID: "y",
        },
        {
          label: `${vendorCode} - PO Count`,
          data: data.posCount,
          borderColor: "#f39c12",
          backgroundColor: "rgba(243, 156, 18, 0.1)",
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: "#f39c12",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          yAxisID: "y1",
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
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            font: { size: 12, weight: "600" },
            padding: 15,
          },
        },
        title: {
          display: true,
          text: `Supplier Delivery Performance - ${vendorCode}`,
          font: { size: 14, weight: "bold" },
          padding: 20,
        },
      },
      scales: {
        y: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: "On-Time Delivery %",
            font: { weight: "600" },
          },
        },
        y1: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          title: {
            display: true,
            text: "Purchase Orders",
            font: { weight: "600" },
          },
          grid: {
            drawOnChartArea: false,
          },
        },
        x: {
          title: {
            display: true,
            text: "Quarter",
            font: { weight: "600" },
          },
        },
      },
    },
  });
}

/**
 * Hide trend chart
 */
function hideTrendChart() {
  const chartDisplay = document.getElementById("chartDisplay");
  const placeholder = document.getElementById("chartPlaceholder");

  chartDisplay.style.display = "none";
  chartDisplay.classList.remove("active");
  placeholder.style.display = "flex";

  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }
}

/**
 * Show error message
 */
function showError(containerId, message) {
  console.error(
    "[supplier-scorecard] Showing error in",
    containerId,
    ":",
    message,
  );
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("[supplier-scorecard] Container not found:", containerId);
    return;
  }
  container.innerHTML = `<p class="error">${message}</p>`;
}

// Load data on page load
window.addEventListener("DOMContentLoaded", () => {
  fetchTopSuppliers().catch((err) => {
    console.error(
      "[supplier-scorecard] Unhandled error in fetchTopSuppliers:",
      err,
    );
  });
});

// Safety net: if document is already loaded, call immediately
if (document.readyState === "loading") {
  // Waiting for DOMContentLoaded...
} else {
  fetchTopSuppliers().catch((err) => {
    console.error(
      "[supplier-scorecard] Unhandled error in immediate fetchTopSuppliers:",
      err,
    );
  });
}
