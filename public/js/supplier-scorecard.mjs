import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

let allSuppliers = [];
let currentChart = null;
let currentPeriod = "rolling12"; // 'rolling12' or 'prev-cy'
let currentVendor = null;

/**
 * Compute start/end dates for the current period.
 * rolling12: first of the month 12 months ago → today.
 * prev-cy: Jan 1 → Dec 31 of last calendar year.
 */
function getPeriodDates() {
  const today = new Date();
  if (currentPeriod === "rolling12") {
    const start = new Date(today.getFullYear(), today.getMonth() - 12, 1);
    return { startDate: start, endDate: today };
  } else {
    const prevYear = today.getFullYear() - 1;
    return {
      startDate: new Date(prevYear, 0, 1),
      endDate: new Date(prevYear, 11, 31),
    };
  }
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPeriodLabel() {
  const today = new Date();
  if (currentPeriod === "rolling12") {
    const start = new Date(today.getFullYear(), today.getMonth() - 12, 1);
    const fmt = (d) =>
      d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    return `Rolling 12 Months (${fmt(start)} – ${fmt(today)})`;
  } else {
    return `Calendar Year ${today.getFullYear() - 1}`;
  }
}

/**
 * Fetch top 10 suppliers data
 */
async function fetchTopSuppliers() {
  try {
    const apiUrl = await getApiUrl();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

    const { startDate, endDate } = getPeriodDates();
    const response = await fetch(
      `${apiUrl}/supplier-scorecard/top-suppliers?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`,
      { signal: controller.signal },
    );

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
    document.getElementById("topSuppliersTitle").textContent =
      `Top 10 Suppliers — ${getPeriodLabel()}`;
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

  select.onchange = (e) => {
    currentVendor = e.target.value || null;
    if (currentVendor) {
      fetchSupplierTrend(currentVendor);
    } else {
      hideTrendChart();
    }
  };
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
    const { startDate, endDate } = getPeriodDates();
    const trendArray = buildTrend(rawData, startDate, endDate);

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
 * Build quarterly trend from raw PO records
 */
function buildTrend(rawRows, startDate, endDate) {
  const filterStart = new Date(startDate);
  filterStart.setHours(0, 0, 0, 0);
  const filterEnd = new Date(endDate);
  filterEnd.setHours(23, 59, 59, 999);

  // Filter individual lines to the period BEFORE collapsing to PO-level.
  // If we collapse first, a PO with any line outside the period gets its max
  // dueDate pushed beyond filterEnd and the entire PO is dropped.
  const periodRows = rawRows.filter((row) => {
    const due = new Date(row.dueDate);
    return !isNaN(due.getTime()) && due >= filterStart && due <= filterEnd;
  });

  // Collapse to PO-level (latest due/received among in-period lines only)
  const poMap = new Map();

  for (const row of periodRows) {
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

  const poRows = Array.from(poMap.values());

  const quarterMap = new Map();

  for (const row of poRows) {
    const due = new Date(row.dueDate);

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

/**
 * Render a vendor trend to a PNG data URL using an off-screen canvas.
 * Returns a Promise that resolves with the data URL once Chart.js has drawn.
 */
function renderVendorToDataURL(trendData, vendorCode) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 500;

    const whiteBackground = {
      id: "exportBackground",
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
      },
    };

    const chart = new Chart(canvas, {
      type: "line",
      data: {
        labels: trendData.quarters,
        datasets: [
          {
            label: `${vendorCode} - On-Time Delivery %`,
            data: trendData.onTimePercentages,
            borderColor: "#1a472a",
            backgroundColor: "rgba(26, 71, 42, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointBackgroundColor: "#1a472a",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            yAxisID: "y",
          },
          {
            label: `${vendorCode} - PO Count`,
            data: trendData.posCount,
            borderColor: "#f39c12",
            backgroundColor: "rgba(243, 156, 18, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: "#f39c12",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: false,
        animation: {
          duration: 0,
          onComplete: () => {
            resolve(canvas.toDataURL("image/png"));
            chart.destroy();
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: { font: { size: 13, weight: "600" }, padding: 15 },
          },
          title: {
            display: true,
            text: `Supplier Delivery Performance - ${vendorCode}`,
            font: { size: 15, weight: "bold" },
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
            grid: { drawOnChartArea: false },
          },
          x: {
            title: { display: true, text: "Quarter", font: { weight: "600" } },
          },
        },
      },
      plugins: [whiteBackground],
    });
  });
}

/**
 * Export trend charts for all top-10 suppliers as a ZIP of PNGs.
 */
async function exportAllCharts() {
  if (!window.JSZip) {
    alert("JSZip library not loaded — please refresh the page.");
    return;
  }
  if (allSuppliers.length === 0) {
    alert("Load the top 10 suppliers first.");
    return;
  }

  const btn = document.getElementById("exportChartsBtn");
  const statusEl = document.getElementById("exportStatus");
  btn.disabled = true;

  const zip = new window.JSZip();
  const { startDate, endDate } = getPeriodDates();
  const apiUrl = await getApiUrl();
  let exported = 0;

  for (let i = 0; i < allSuppliers.length; i++) {
    const supplier = allSuppliers[i];
    const vendorCode = supplier.VENDOR;

    statusEl.textContent = `Fetching ${vendorCode} (${i + 1} / ${allSuppliers.length})\u2026`;

    try {
      const response = await fetch(
        `${apiUrl}/supplier-scorecard/trend?vendor=${encodeURIComponent(vendorCode)}`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rawData = await response.json();
      if (rawData.error) throw new Error(rawData.error);

      const trendArray = buildTrend(rawData, startDate, endDate);
      if (trendArray.length === 0) {
        statusEl.textContent = `No data for ${vendorCode}, skipping\u2026`;
        continue;
      }

      const trendData = {
        quarters: trendArray.map((d) => d.quarter),
        onTimePercentages: trendArray.map((d) => d.onTimePercent),
        posCount: trendArray.map((d) => d.poCount),
      };

      statusEl.textContent = `Rendering ${vendorCode} (${i + 1} / ${allSuppliers.length})\u2026`;
      const dataUrl = await renderVendorToDataURL(trendData, vendorCode);
      const base64 = dataUrl.split(",")[1];

      const safeCode = vendorCode.replace(/[^a-zA-Z0-9_-]/g, "_");
      const rank = String(i + 1).padStart(2, "0");
      zip.file(`${rank}_${safeCode}_trend.png`, base64, { base64: true });
      exported++;
    } catch (err) {
      console.error(`[export] Error for ${vendorCode}:`, err);
      statusEl.textContent = `Error on ${vendorCode}: ${err.message}`;
    }
  }

  if (exported === 0) {
    statusEl.textContent = "Nothing to export.";
    btn.disabled = false;
    return;
  }

  statusEl.textContent = "Generating ZIP\u2026";
  const blob = await zip.generateAsync({ type: "blob" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `supplier-trends_${formatDate(new Date())}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);

  statusEl.textContent = `Done \u2014 ${exported} chart(s) downloaded.`;
  setTimeout(() => {
    statusEl.textContent = "";
  }, 4000);
  btn.disabled = false;
}

function initPage() {
  document.getElementById("exportChartsBtn").addEventListener("click", () => {
    exportAllCharts().catch((err) => {
      console.error("[export] Unhandled error:", err);
    });
  });

  document.querySelectorAll('input[name="period"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      currentPeriod = e.target.value;
      currentVendor = null;
      document.getElementById("supplierSelect").value = "";
      hideTrendChart();
      fetchTopSuppliers().catch((err) => {
        console.error("[supplier-scorecard] Error reloading suppliers:", err);
      });
    });
  });

  fetchTopSuppliers().catch((err) => {
    console.error(
      "[supplier-scorecard] Unhandled error in fetchTopSuppliers:",
      err,
    );
  });
}

// Modules are always deferred — DOMContentLoaded fires after this module
// is parsed, so a single listener is sufficient (no safety net needed).
window.addEventListener("DOMContentLoaded", initPage);
