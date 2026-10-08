import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

const UNIT_COLORS = {
  OTIF: "#2E8B57",
  OTD: "#4169E1",
  PPM: "#FF6347",
  ESCAPES: "#DC143C",
  Q: "#8A2BE2",
};

const DEFAULT_COLOR = "#666666";

// Same three panels as the original custsat.py report
const PANELS = [
  {
    key: "delivery",
    title: "OTIF / OTD (On Time Delivery)",
    yLabel: "Percentage (%)",
    units: ["OTIF", "OTD"],
    marker: "circle",
    yMax: 100,
    yStep: 10,
  },
  {
    key: "ppm",
    title: "PPM (Parts Per Million)",
    yLabel: "PPM",
    units: ["PPM"],
    marker: "star",
    valueLabels: true,
  },
  {
    key: "quality",
    title: "Escapes (Count) / Quality Metrics",
    yLabel: "Count / Score",
    units: ["ESCAPES", "Q"],
    marker: "rect",
    valueLabels: ["ESCAPES"],
    minYMax: 10,
  },
];

// Draws each point's value above the marker for datasets flagged showLabels
const valueLabelPlugin = {
  id: "custsatValueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset, i) => {
      if (!dataset.showLabels) return;
      const meta = chart.getDatasetMeta(i);
      ctx.save();
      ctx.font = "11px sans-serif";
      ctx.fillStyle = dataset.borderColor;
      ctx.textAlign = "center";
      meta.data.forEach((point, idx) => {
        const v = dataset.data[idx];
        if (v === null || v === undefined) return;
        ctx.fillText(Math.round(v).toLocaleString("en-US"), point.x, point.y - 10);
      });
      ctx.restore();
    });
  },
};

let currentPeriod = "rolling12";
let customerCharts = []; // { customerId, charts: Chart[], title: string }
let loadToken = 0;

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  const name = new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short" });
  return m === 1 ? `${name} ${y}` : name;
}

function rangeLabel(rows) {
  const fmt = (d) => {
    const [y, m] = monthKey(d).split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });
  };
  const dates = rows.map((r) => r.sampleDate).sort();
  return `${fmt(dates[0])} to ${fmt(dates[dates.length - 1])}`;
}

function groupByCustomer(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.customerId)) map.set(row.customerId, []);
    map.get(row.customerId).push(row);
  }
  return map;
}

function destroyCharts() {
  customerCharts.forEach((c) => c.charts.forEach((ch) => ch.destroy()));
  customerCharts = [];
  document.getElementById("custsatContainer").innerHTML = "";
}

function setStatus(message, isError = false) {
  const el = document.getElementById("custsatStatus");
  el.textContent = message;
  el.classList.toggle("error", isError);
}

function buildPanelChart(canvas, panel, customerRows, months) {
  const datasets = [];

  for (const unit of panel.units) {
    const unitRows = customerRows.filter((r) => r.unit === unit);
    if (unitRows.length === 0) continue;

    // One point per month; the latest sample in the month wins
    const byMonth = new Map();
    unitRows
      .slice()
      .sort((a, b) => a.sampleDate.localeCompare(b.sampleDate))
      .forEach((r) => byMonth.set(monthKey(r.sampleDate), r.value));

    const color = UNIT_COLORS[unit] || DEFAULT_COLOR;
    const showLabels = Array.isArray(panel.valueLabels)
      ? panel.valueLabels.includes(unit)
      : !!panel.valueLabels;

    datasets.push({
      label: unit,
      data: months.map((m) => (byMonth.has(m) ? byMonth.get(m) : null)),
      borderColor: color,
      backgroundColor: "#ffffff",
      borderWidth: 2.5,
      pointStyle: panel.marker,
      pointRadius: 6,
      pointBorderWidth: 2,
      pointBackgroundColor: "#ffffff",
      pointBorderColor: color,
      spanGaps: true,
      tension: 0,
      showLabels,
    });
  }

  if (datasets.length === 0) return null;

  const yScale = {
    beginAtZero: true,
    title: { display: true, text: panel.yLabel, font: { weight: "bold" } },
  };
  if (panel.yMax) {
    yScale.max = panel.yMax;
    yScale.ticks = { stepSize: panel.yStep };
  } else if (panel.minYMax) {
    const maxVal = Math.max(
      ...datasets.flatMap((d) => d.data.filter((v) => v !== null)),
    );
    yScale.max = Math.ceil(Math.max(maxVal * 1.2, panel.minYMax));
  } else {
    // Headroom so the value labels above the points are not clipped
    yScale.grace = "10%";
  }

  return new Chart(canvas, {
    type: "line",
    data: { labels: months.map(monthLabel), datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: panel.title,
          align: "end",
          font: { size: 13, weight: "bold" },
        },
        legend: { display: true, position: "top" },
      },
      scales: {
        y: yScale,
        x: { ticks: { maxRotation: 45, minRotation: 45 } },
      },
    },
    plugins: [valueLabelPlugin],
  });
}

function renderCustomer(customerId, customerRows) {
  const container = document.getElementById("custsatContainer");
  const range = rangeLabel(customerRows);

  const section = document.createElement("section");
  section.className = "custsat-customer";

  const header = document.createElement("div");
  header.className = "custsat-customer-header";

  const titleBox = document.createElement("div");
  const h2 = document.createElement("h2");
  h2.textContent = `Customer Performance Trends: ${customerId}`;
  const rangeEl = document.createElement("div");
  rangeEl.className = "custsat-range";
  rangeEl.textContent = `(${range})`;
  titleBox.append(h2, rangeEl);

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "export-btn";
  saveBtn.textContent = "\u2B07 Save PNG";

  header.append(titleBox, saveBtn);
  section.appendChild(header);
  container.appendChild(section);

  // Shared month axis so OTIF and OTD (or ESCAPES and Q) line up
  const months = [...new Set(customerRows.map((r) => monthKey(r.sampleDate)))].sort();

  const charts = [];
  for (const panel of PANELS) {
    const wrapper = document.createElement("div");
    wrapper.className = "custsat-chart";
    const canvas = document.createElement("canvas");
    wrapper.appendChild(canvas);
    section.appendChild(wrapper);

    const chart = buildPanelChart(canvas, panel, customerRows, months);
    if (chart) {
      charts.push(chart);
    } else {
      wrapper.remove();
    }
  }

  const entry = {
    customerId,
    charts,
    title: `Customer Performance Trends: ${customerId}\n(${range})`,
  };
  customerCharts.push(entry);
  saveBtn.addEventListener("click", () => saveCustomerPng(entry));
}

function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// US Letter at 300 DPI with a 0.5" margin, so the PNG prints at 100% without clipping
const PRINT_DPI = 300;
const PAGE_LONG = 11 * PRINT_DPI;
const PAGE_SHORT = 8.5 * PRINT_DPI;
const PAGE_MARGIN = 0.5 * PRINT_DPI;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Canvas PNGs carry no resolution; add a pHYs chunk so viewers print at the right size
async function canvasToPngBlob(canvas, dpi) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const png = new Uint8Array(await blob.arrayBuffer());

  const chunk = new Uint8Array(21); // length(4) + type(4) + data(9) + crc(4)
  const view = new DataView(chunk.buffer);
  const pixelsPerMeter = Math.round(dpi / 0.0254);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, pixelsPerMeter);
  view.setUint32(12, pixelsPerMeter);
  chunk[16] = 1; // unit: meter
  view.setUint32(17, crc32(chunk.subarray(4, 17)));

  const ihdrEnd = 33; // 8-byte signature + 25-byte IHDR chunk
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, ihdrEnd), 0);
  out.set(chunk, ihdrEnd);
  out.set(png.subarray(ihdrEnd), ihdrEnd + chunk.length);
  return new Blob([out], { type: "image/png" });
}

async function saveCustomerPng(entry) {
  if (entry.charts.length === 0) return;

  // Compose title + charts at their native size
  const titleHeight = 80;
  const width = Math.max(...entry.charts.map((c) => c.canvas.width));
  const height =
    titleHeight + entry.charts.reduce((sum, c) => sum + c.canvas.height, 0);

  const content = document.createElement("canvas");
  content.width = width;
  content.height = height;
  const cctx = content.getContext("2d");
  cctx.fillStyle = "#ffffff";
  cctx.fillRect(0, 0, width, height);

  cctx.fillStyle = "#000000";
  cctx.textAlign = "center";
  const [line1, line2] = entry.title.split("\n");
  cctx.font = "bold 28px sans-serif";
  cctx.fillText(line1, width / 2, 36);
  cctx.font = "20px sans-serif";
  cctx.fillText(line2, width / 2, 66);

  let y = titleHeight;
  for (const chart of entry.charts) {
    cctx.drawImage(chart.canvas, 0, y);
    y += chart.canvas.height;
  }

  // Place on a letter page, landscape when the content is wider than tall
  const landscape = width > height;
  const pageW = landscape ? PAGE_LONG : PAGE_SHORT;
  const pageH = landscape ? PAGE_SHORT : PAGE_LONG;
  const scale = Math.min(
    (pageW - PAGE_MARGIN * 2) / width,
    (pageH - PAGE_MARGIN * 2) / height,
  );
  const drawW = width * scale;
  const drawH = height * scale;

  const page = document.createElement("canvas");
  page.width = pageW;
  page.height = pageH;
  const pctx = page.getContext("2d");
  pctx.fillStyle = "#ffffff";
  pctx.fillRect(0, 0, pageW, pageH);
  pctx.imageSmoothingQuality = "high";
  pctx.drawImage(content, (pageW - drawW) / 2, PAGE_MARGIN, drawW, drawH);

  const blob = await canvasToPngBlob(page, PRINT_DPI);
  const safeId = String(entry.customerId).replace(/[^\w-]+/g, "_");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${dateStamp()}_${safeId}_trend.png`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function saveAllPngs() {
  for (const entry of customerCharts) {
    await saveCustomerPng(entry);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

async function loadReport() {
  const token = ++loadToken;
  destroyCharts();
  setStatus("Loading customer satisfaction data...");

  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(
      `${apiUrl}/custsat?period=${encodeURIComponent(currentPeriod)}`,
    );
    const data = await response.json();
    if (token !== loadToken) return;

    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    if (data.rows.length === 0) {
      setStatus("No customer satisfaction data found for this period.");
      return;
    }

    const grouped = groupByCustomer(data.rows);
    setStatus(
      `${data.rows.length} records for ${grouped.size} customer${grouped.size === 1 ? "" : "s"}.`,
    );
    for (const [customerId, rows] of grouped) {
      renderCustomer(customerId, rows);
    }
  } catch (error) {
    if (token !== loadToken) return;
    console.error("[custsat] Error loading report:", error);
    setStatus(`Failed to load customer satisfaction data: ${error.message}`, true);
  }
}

document.querySelectorAll('input[name="period"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    currentPeriod = e.target.value;
    loadReport();
  });
});
document.getElementById("saveAllBtn").addEventListener("click", saveAllPngs);
document.getElementById("printBtn").addEventListener("click", () => window.print());

loadReport();
