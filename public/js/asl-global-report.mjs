import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

const apiUrl = await getApiUrl();

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousMonthRange() {
  const today = new Date();
  const firstOfCurrentMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
  );
  const end = new Date(firstOfCurrentMonth.getTime() - 24 * 60 * 60 * 1000);
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return { start, end };
}

function setStatus(message, isError = false) {
  const status = document.getElementById("status");
  if (!status) return;
  status.textContent = message || "";
  status.classList.toggle("error", isError);
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function renderSummary(summary) {
  const container = document.getElementById("summary");
  if (!container) return;

  const cards = [
    ["Date Range", `${summary.startDate} to ${summary.endDate}`],
    ["ASL Suppliers", summary.aslSupplierCount],
    ["Global Vendors", summary.globalVendorCount],
    ["Matched", summary.matchedCount],
    ["Global Only", summary.globalOnlyCount],
    ["Global-Only PO Lines", summary.globalOnlyLineCount || 0],
    ["Total Lines", summary.totalLines],
    ["Total Spend", `$${formatMoney(summary.totalSpend)}`],
  ];

  container.innerHTML = cards
    .map(
      ([label, value]) =>
        `<article class="summary-card"><h3>${label}</h3><p>${value}</p></article>`,
    )
    .join("");
}

function renderTable(wrapperId, rows, columns, emptyMessage) {
  const wrap = document.getElementById(wrapperId);
  if (!wrap) return;

  if (!rows || rows.length === 0) {
    wrap.innerHTML = `<p class="empty">${emptyMessage}</p>`;
    return;
  }

  const thead = columns.map((c) => `<th>${c.label}</th>`).join("");

  const tbody = rows
    .map((row) => {
      const tds = columns
        .map((c) => {
          const raw = row[c.key];
          const rendered = c.format ? c.format(raw, row) : (raw ?? "");
          return `<td>${rendered}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  wrap.innerHTML = `
    <div class="table-container">
      <table class="data-table">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
  `;
}

function initUnmatchedToggle() {
  const button = document.getElementById("toggleUnmatchedBtn");
  const container = document.getElementById("globalOnlyLinesContainer");
  if (!button || !container) return;

  const setExpanded = (expanded) => {
    button.setAttribute("aria-expanded", expanded ? "true" : "false");
    button.textContent = expanded
      ? "Hide Unmatched PO-Line Records"
      : "Show Unmatched PO-Line Records";
    container.classList.toggle("is-hidden", !expanded);
  };

  setExpanded(false);

  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    setExpanded(!expanded);
  });
}

async function runReport() {
  const startDate = document.getElementById("startDate")?.value;
  const endDate = document.getElementById("endDate")?.value;

  if (!startDate || !endDate) {
    setStatus("Choose both start and end date.", true);
    return;
  }

  setStatus("Loading report...");

  try {
    const res = await fetch(
      `${apiUrl}/asl-global-report?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    );
    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    renderSummary(data.summary);

    renderTable(
      "matchedTableWrap",
      data.matched,
      [
        { key: "vendor", label: "Vendor" },
        { key: "aslSupplierName", label: "ASL Name" },
        { key: "poCount", label: "POs" },
        { key: "lineCount", label: "Lines" },
        {
          key: "totalSpend",
          label: "Spend",
          format: (v) => `$${formatMoney(v)}`,
        },
        { key: "onTimeLineCount", label: "On-Time Lines" },
        { key: "lateOrOpenLineCount", label: "Late/Open Lines" },
      ],
      "No matched suppliers found for this date range.",
    );

    renderTable(
      "globalOnlyTableWrap",
      data.globalOnly,
      [
        { key: "vendor", label: "Vendor" },
        { key: "vendorName", label: "Name" },
        { key: "poCount", label: "POs" },
        { key: "lineCount", label: "Lines" },
        {
          key: "totalSpend",
          label: "Spend",
          format: (v) => `$${formatMoney(v)}`,
        },
        { key: "onTimeLineCount", label: "On-Time Lines" },
        { key: "lateOrOpenLineCount", label: "Late/Open Lines" },
      ],
      "No Global-only suppliers found for this date range.",
    );

    renderTable(
      "globalOnlyLinesTableWrap",
      data.globalOnlyLines,
      [
        { key: "vendor", label: "Vendor" },
        { key: "purchaseOrder", label: "PO" },
        { key: "poType", label: "PO Type" },
        { key: "part", label: "Part" },
        { key: "description", label: "Description" },
        { key: "dueDate", label: "Due Date" },
        { key: "receivedDate", label: "Received Date" },
        { key: "qtyOrder", label: "Qty Order" },
        { key: "qtyReceived", label: "Qty Received" },
        {
          key: "extension",
          label: "Extension",
          format: (v) => `$${formatMoney(v)}`,
        },
      ],
      "No unmatched PO-line records found for this date range.",
    );

    setStatus("Report loaded.");
  } catch (error) {
    console.error("[asl-global-report]", error);
    setStatus(`Failed to load report: ${error.message}`, true);
  }
}

function initDefaults() {
  const { start, end } = getPreviousMonthRange();
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");

  if (startInput) startInput.value = formatDateInput(start);
  if (endInput) endInput.value = formatDateInput(end);
}

function init() {
  initDefaults();
  initUnmatchedToggle();

  const btn = document.getElementById("runReportBtn");
  if (btn) {
    btn.addEventListener("click", runReport);
  }

  runReport();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
