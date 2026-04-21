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
let sysdocData = [];

document.addEventListener("DOMContentLoaded", async function () {
  apiUrl = await getApiUrl();
  url = `${apiUrl}/input/sysdocissues`;
  user = await getSessionUser();
  config = await getConfig();

  setupEventListeners();
  updateTimestamp();
  await loadSYSDOCData();
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

async function loadSYSDOCData() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    sysdocData = await response.json();
    displaySYSDOCTable(sysdocData);
  } catch (error) {
    console.error("Error loading SYSDOC data:", error);
    document.getElementById("sysdocTableContainer").innerHTML =
      '<p class="no-data-message error">Failed to load SYSDOC data. Please refresh the page.</p>';
  }
}

function displaySYSDOCTable(data) {
  const container = document.getElementById("sysdocTableContainer");
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML =
      '<p class="no-data-message">No SYSDOC issues found.</p>';
    return;
  }

  container.innerHTML = "";

  const table = document.createElement("table");
  table.className = "sysdoc-table";

  // Create header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const columns = [
    { key: "INPUT_ID", label: "ID", width: "50px" },
    { key: "INPUT_DATE", label: "Date", width: "70px" },
    { key: "AGE", label: "Age (Days)", width: "70px" },
    { key: "SUBJECT", label: "Subject", width: "70px" },
    { key: "ASSIGNED_TO", label: "Assigned To", width: "90px" },
    { key: "DUE_DATE", label: "Due Date", width: "70px" },
    { key: "CLOSED_DATE", label: "Closed Date", width: "80px" },
    { key: "REQUEST_TEXT", label: "Request", width: "250px" },
  ];

  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.label;
    th.style.width = col.width;
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
      td.style.width = col.width;
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

        // Add color coding based on age - SYSDOC thresholds: 60 days red, 30 days orange
        if (ageInDays > 60) {
          td.style.color = "#e74c3c";
          td.style.fontWeight = "bold";
        } else if (ageInDays > 30) {
          td.style.color = "#f39c12";
          td.style.fontWeight = "bold";
        }
      } else if (col.key === "DUE_DATE") {
        // Format date and add status indicators
        if (row.CLOSED_DATE) {
          // Closed items don't show overdue status
          const dueDate = row[col.key] ? new Date(row[col.key]) : null;
          td.textContent = dueDate ? dueDate.toLocaleDateString() : "";
          td.style.color = "#7f8c8d";
        } else if (row[col.key]) {
          // Open items show status indicators
          const dueDate = new Date(row[col.key]);
          const today = new Date();
          const daysUntilDue = Math.ceil(
            (dueDate - today) / (1000 * 60 * 60 * 24),
          );

          if (daysUntilDue < 0) {
            td.innerHTML = `⚠️ OVERDUE`;
            td.style.color = "#e74c3c";
            td.style.fontWeight = "bold";
          } else if (daysUntilDue <= 7) {
            td.textContent = `${daysUntilDue}d`;
            td.style.color = "#f39c12";
            td.style.fontWeight = "bold";
          } else {
            td.style.color = "#27ae60";
            td.textContent = dueDate.toLocaleDateString();
          }
        }
      } else if (col.key === "INPUT_DATE" || col.key === "CLOSED_DATE") {
        // Format dates
        const date = row[col.key] ? new Date(row[col.key]) : null;
        td.textContent = date ? date.toLocaleDateString() : "";
      } else if (col.key === "REQUEST_TEXT") {
        // Request text with wrapping
        td.textContent = value || "";
        td.style.whiteSpace = "normal";
        td.style.wordWrap = "break-word";
        td.style.maxWidth = "250px";
      } else {
        td.textContent = value;
      }

      td.setAttribute("data-key", col.key);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

function performSearch() {
  const searchInput = document.getElementById("searchInput");
  const searchTerm = searchInput.value.toLowerCase();
  const table = document.querySelector(".sysdoc-table");

  if (!table) return;

  const rows = table.querySelectorAll("tbody tr");

  rows.forEach((row) => {
    const id = row.querySelector('[data-key="INPUT_ID"]')?.textContent || "";
    const subject =
      row.querySelector('[data-key="SUBJECT"]')?.textContent || "";
    const assignedTo =
      row.querySelector('[data-key="ASSIGNED_TO"]')?.textContent || "";
    const request =
      row.querySelector('[data-key="REQUEST_TEXT"]')?.textContent || "";

    const searchText =
      `${id} ${subject} ${assignedTo} ${request}`.toLowerCase();

    if (searchText.includes(searchTerm)) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

function exportToCSV() {
  if (!sysdocData || sysdocData.length === 0) {
    alert("No data to export");
    return;
  }

  const headers = [
    "ID",
    "Date",
    "Age (Days)",
    "Subject",
    "Assigned To",
    "Due Date",
    "Request",
    "Closed Date",
  ];

  const rows = sysdocData.map((row) => {
    const inputDate = new Date(row.INPUT_DATE);
    const today = new Date();
    const ageInDays = Math.floor((today - inputDate) / (1000 * 60 * 60 * 24));

    const dueDate = row.DUE_DATE ? new Date(row.DUE_DATE) : null;
    const closedDate = row.CLOSED_DATE ? new Date(row.CLOSED_DATE) : null;

    return [
      row.INPUT_ID,
      inputDate.toLocaleDateString(),
      ageInDays,
      row.SUBJECT || "",
      row.ASSIGNED_TO || "",
      dueDate ? dueDate.toLocaleDateString() : "",
      (row.REQUEST_TEXT || "").replace(/"/g, '""'),
      closedDate ? closedDate.toLocaleDateString() : "",
    ];
  });

  const csvContent = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  link.setAttribute("href", url);
  link.setAttribute("download", `sysdoc-issues-${dateStr}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function printReport() {
  window.print();
}
