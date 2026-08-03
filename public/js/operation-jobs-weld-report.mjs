import { loadHeaderFooter } from "./utils.mjs";

loadHeaderFooter();

const form = document.getElementById("report-form");
const yearInput = document.getElementById("year-input");
const monthInput = document.getElementById("month-input");
const sortInput = document.getElementById("sort-input");
const statusEl = document.getElementById("status");

const metaSection = document.getElementById("meta-section");
const rowsSection = document.getElementById("rows-section");

const criteriaEl = document.getElementById("criteria");
const opCodesEl = document.getElementById("op-codes");
const rowsBody = document.getElementById("rows-body");

function previousMonthParts() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (month === 0) {
    return { year: String(year - 1), month: "12" };
  }

  return { year: String(year), month: String(month).padStart(2, "0") };
}

function populateYearOptions() {
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 10;
  const maxYear = currentYear + 2;

  yearInput.innerHTML = "";
  for (let y = maxYear; y >= minYear; y -= 1) {
    const option = document.createElement("option");
    option.value = String(y);
    option.textContent = String(y);
    yearInput.appendChild(option);
  }
}

function populateMonthOptions() {
  const labels = [
    "01 - January",
    "02 - February",
    "03 - March",
    "04 - April",
    "05 - May",
    "06 - June",
    "07 - July",
    "08 - August",
    "09 - September",
    "10 - October",
    "11 - November",
    "12 - December",
  ];

  monthInput.innerHTML = "";
  labels.forEach((label, index) => {
    const month = String(index + 1).padStart(2, "0");
    const option = document.createElement("option");
    option.value = month;
    option.textContent = label;
    monthInput.appendChild(option);
  });
}

function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = `ops-report-status ${type}`;
}

function clearResults() {
  criteriaEl.innerHTML = "";
  opCodesEl.innerHTML = "";
  rowsBody.innerHTML = "";
  metaSection.style.display = "none";
  rowsSection.style.display = "none";
}

function renderPayload(payload) {
  const { criteria, operationCodes, rows, rowCount } = payload;
  const operationFilter = Array.isArray(criteria.operationIn)
    ? criteria.operationIn.join(", ")
    : "";

  criteriaEl.innerHTML = `
    <div><strong>Month:</strong> ${criteria.month}</div>
    <div><strong>Date Window:</strong> ${criteria.startDateInclusive} to ${criteria.endDateExclusive} (exclusive)</div>
    <div><strong>Operation Filter:</strong> ${operationFilter || "(none)"}</div>
    <div><strong>Sort:</strong> ${criteria.sort}</div>
    <div><strong>Rows:</strong> ${rowCount}</div>
  `;

  opCodesEl.innerHTML = "";
  for (const code of operationCodes || []) {
    const chip = document.createElement("span");
    chip.className = "ops-chip";
    chip.textContent = code || "(blank)";
    opCodesEl.appendChild(chip);
  }

  rowsBody.innerHTML = "";
  for (const row of rows || []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.dateCompletedIso || ""}</td>
      <td>${row.job || ""}</td>
      <td>${row.suffix || ""}</td>
      <td>${row.seq || ""}</td>
      <td>${row.operation || ""}</td>
      <td>${row.description || ""}</td>
      <td>${row.part || ""}</td>
      <td>${row.partDescription || ""}</td>
      <td>${row.customer || ""}</td>
      <td>${row.quantity}</td>
      <td>${row.unitsComplete}</td>
      <td>${row.unitsScrap}</td>
      <td>${row.sourceTable || ""}</td>
    `;
    rowsBody.appendChild(tr);
  }

  metaSection.style.display = "block";
  rowsSection.style.display = "block";
}

async function runReport() {
  const month = `${yearInput.value}-${monthInput.value}`;
  const sort = sortInput.value;

  if (!yearInput.value || !monthInput.value) {
    setStatus("Select a month first.", "error");
    return;
  }

  clearResults();
  setStatus("Loading report...", "loading");

  try {
    const params = new URLSearchParams({ month, sort });
    const response = await fetch(
      `/operation-jobs/weld-operations-report?${params.toString()}`,
      {
        credentials: "include",
      },
    );

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { success: false, error: `${response.status} ${response.statusText}` };
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || "Report request failed.");
    }

    renderPayload(payload);
    setStatus(
      `Loaded ${payload.rowCount} rows for ${payload.criteria.month}.`,
      "success",
    );
  } catch (err) {
    setStatus(`Error: ${err.message}`, "error");
  }
}

populateYearOptions();
populateMonthOptions();
const initial = previousMonthParts();
yearInput.value = initial.year;
monthInput.value = initial.month;
form.addEventListener("submit", (event) => {
  event.preventDefault();
  runReport();
});

runReport();
