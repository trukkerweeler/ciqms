import {
  loadHeaderFooter,
  getSessionUser,
  getApiUrl,
  getConfig,
} from "./utils.mjs";

// Initialize header/footer
loadHeaderFooter();

// Configuration - will be set in DOM Loaded
let url = "";
let apiUrl = "";
let user;
let config;
let ctaData = [];

document.addEventListener("DOMContentLoaded", async function () {
  apiUrl = await getApiUrl();
  url = `${apiUrl}/input/ctaissues`;
  user = await getSessionUser();
  config = await getConfig();

  setupEventListeners();
  updateTimestamp();
  await loadCTAData();
});

function setupEventListeners() {
  // Search functionality
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("keyup", performSearch);
  }

  // Print button
  const printBtn = document.getElementById("printBtn");
  if (printBtn) {
    printBtn.addEventListener("click", printReport);
  }

  // Export button
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportToCSV);
  }
}

function updateTimestamp() {
  const timestamp = document.getElementById("reportTimestamp");
  if (timestamp) {
    const now = new Date();
    const formattedDate = now.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    timestamp.textContent = `Generated: ${formattedDate}`;
  }
}

async function loadCTAData() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    ctaData = await response.json();
    displayCTATable(ctaData);
  } catch (error) {
    console.error("Error loading CTA data:", error);
    document.getElementById("ctaTableContainer").innerHTML =
      '<p class="no-data-message error">Failed to load CTA data. Please refresh the page.</p>';
  }
}

function displayCTATable(data) {
  const container = document.getElementById("ctaTableContainer");
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML =
      '<p class="no-data-message">No CTA issues found for 2025.</p>';
    return;
  }

  container.innerHTML = "";

  const table = document.createElement("table");
  table.className = "cta-table";

  // Create header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const columns = [
    { key: "INPUT_ID", label: "ID", width: "80px" },
    { key: "INPUT_DATE", label: "Date", width: "100px" },
    { key: "AGE", label: "Age (Days)", width: "100px" },
    { key: "SUBJECT", label: "Subject", width: "80px" },
    { key: "ASSIGNED_TO", label: "Assigned To", width: "120px" },
    { key: "DUE_DATE", label: "Due Date", width: "100px" },
    { key: "REQUEST_TEXT", label: "Request", width: "250px" },
    { key: "CLOSED_DATE", label: "Closed Date", width: "100px" },
  ];

  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.label;
    th.setAttribute(
      "style",
      `font-size: 1.1rem !important; background-color: #5b3a70 !important; color: white !important; padding: 1rem !important; text-align: left !important; font-weight: 600 !important; letter-spacing: 0.5px !important; border-bottom: 2px solid #8e5fa0 !important; width: ${col.width} !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;`,
    );
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement("tbody");

  data.forEach((row) => {
    const tr = document.createElement("tr");

    columns.forEach((col) => {
      const td = document.createElement("td");
      td.style.fontSize = "1.1rem";
      let value = row[col.key] || "";

      if (col.key === "AGE") {
        // Calculate age in days from INPUT_DATE
        const inputDate = new Date(row.INPUT_DATE);
        const today = new Date();
        const ageInDays = Math.floor(
          (today - inputDate) / (1000 * 60 * 60 * 24),
        );
        value = ageInDays.toString();
        td.textContent = value;

        // Add color coding based on age - CTA thresholds: 60 days red, 30 days orange
        if (ageInDays > 60) {
          td.style.color = "#e74c3c";
          td.style.fontWeight = "bold";
        } else if (ageInDays > 30) {
          td.style.color = "#f39c12";
          td.style.fontWeight = "bold";
        }
      } else if (
        col.key === "INPUT_DATE" ||
        col.key === "DUE_DATE" ||
        col.key === "CLOSED_DATE"
      ) {
        value = formatDate(value);
        td.textContent = value;

        // Add status indicator for DUE_DATE
        if (col.key === "DUE_DATE") {
          const dueDate = new Date(row.DUE_DATE);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);

          const daysUntilDue = Math.floor(
            (dueDate - today) / (1000 * 60 * 60 * 24),
          );

          // Only show overdue/due-soon status if the CTA is not closed
          if (row.CLOSED === "N") {
            if (daysUntilDue < 0) {
              td.classList.add("status-overdue");
              td.textContent += " ⚠️ OVERDUE";
            } else if (daysUntilDue <= 7) {
              td.classList.add("status-due-soon");
              td.textContent += ` (${daysUntilDue}d)`;
            } else {
              td.classList.add("status-on-track");
            }
          } else {
            // If closed, just show the date without status
            td.classList.add("status-completed");
          }
        }
      } else if (col.key === "REQUEST_TEXT") {
        td.className = "truncate-text";
        td.textContent = value;
        td.title = value; // Add tooltip for full text
      } else {
        td.textContent = value;
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

function performSearch() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  const filter = searchInput.value.toLowerCase();
  const filteredData = ctaData.filter((row) => {
    const id = (row.INPUT_ID || "").toString().toLowerCase();
    const subject = (row.SUBJECT || "").toLowerCase();
    const assignedTo = (row.ASSIGNED_TO || "").toLowerCase();
    const requestText = (row.REQUEST_TEXT || "").toLowerCase();

    return (
      id.includes(filter) ||
      subject.includes(filter) ||
      assignedTo.includes(filter) ||
      requestText.includes(filter)
    );
  });

  if (filteredData.length === 0) {
    document.getElementById("ctaTableContainer").innerHTML =
      '<p class="no-data-message">No CTAs match your search.</p>';
  } else {
    displayCTATable(filteredData);
  }
}

function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function printReport() {
  window.print();
}

function exportToCSV() {
  if (ctaData.length === 0) {
    alert("No data to export");
    return;
  }

  // Define columns for export
  const columns = [
    "INPUT_ID",
    "INPUT_DATE",
    "SUBJECT",
    "ASSIGNED_TO",
    "DUE_DATE",
    "REQUEST_TEXT",
    "CLOSED_DATE",
  ];

  // Create CSV header
  let csv = columns.join(",") + "\n";

  // Add data rows
  ctaData.forEach((row) => {
    const rowData = columns.map((col) => {
      let value = row[col] || "";
      // Escape quotes and wrap in quotes if contains comma
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    });
    csv += rowData.join(",") + "\n";
  });

  // Create blob and download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `cta-issues-${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
