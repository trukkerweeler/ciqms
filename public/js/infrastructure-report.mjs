import {
  loadHeaderFooter,
  getSessionUser,
  getApiUrl,
  getConfig,
} from "./utils.mjs";

// Infrastructure Project ID
const INFRASTRUCTURE_PROJECT_ID = "7130";

// Initialize header/footer
loadHeaderFooter();

// Configuration - will be set in DOM Loaded
let url = "";
let apiUrl = "";
let user;
let config;
let infrastructureData = [];
let recurringSubjects = [];
let selectedYear = 2025;

document.addEventListener("DOMContentLoaded", async function () {
  apiUrl = await getApiUrl();
  url = `${apiUrl}/project/${INFRASTRUCTURE_PROJECT_ID}`;
  user = await getSessionUser();
  config = await getConfig();

  setupEventListeners();
  updateTimestamp();
  await loadInfrastructureData();
});

function setupEventListeners() {
  // Year selector
  const yearSelector = document.getElementById("yearSelector");
  if (yearSelector) {
    yearSelector.addEventListener("change", function () {
      selectedYear = parseInt(this.value);
      displayInfrastructureTable(infrastructureData);
      updateSummary(infrastructureData);
    });
  }

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

async function loadInfrastructureData() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    infrastructureData = await response.json();

    // Fetch recurring subjects for this project
    const recurringUrl = `${apiUrl}/project/rcursbjct/${INFRASTRUCTURE_PROJECT_ID}`;
    const recurringResponse = await fetch(recurringUrl);
    if (recurringResponse.ok) {
      recurringSubjects = await recurringResponse.json();
    }

    displayInfrastructureTable(infrastructureData);
    updateSummary(infrastructureData);
  } catch (error) {
    console.error("Error loading infrastructure data:", error);
    document.getElementById("infrastructureTableContainer").innerHTML =
      '<p class="no-data-message error">Failed to load infrastructure data. Please refresh the page.</p>';
  }
}

function getFilteredData(data, forTable = true) {
  // Filter out recurring actions
  let filtered = data.filter((row) => !recurringSubjects.includes(row.SUBJECT));

  // If filtering for table display, apply year filter
  if (forTable) {
    filtered = filtered.filter((row) => {
      // Always include if open
      if (row.CLOSED !== "Y") {
        return true;
      }

      // If closed, include if closed in selected year
      if (row.CLOSED_DATE) {
        const closedYear = new Date(row.CLOSED_DATE).getFullYear();
        return closedYear === selectedYear;
      }

      return false;
    });
  }

  return filtered;
}

function updateSummary(data) {
  const allNonRecurring = data.filter(
    (row) => !recurringSubjects.includes(row.SUBJECT),
  );

  // Count open actions (not filtered by year)
  const openActions = allNonRecurring.filter((row) => row.CLOSED !== "Y");
  const openCount = openActions.length;

  // Calculate average age of open actions
  let totalAge = 0;
  openActions.forEach((row) => {
    if (row.INPUT_DATE) {
      const inputDate = new Date(row.INPUT_DATE);
      const today = new Date();
      const ageInDays = Math.floor((today - inputDate) / (1000 * 60 * 60 * 24));
      totalAge += ageInDays;
    }
  });
  const averageAge = openCount > 0 ? Math.round(totalAge / openCount) : 0;

  // Count actions closed in selected year
  const yearlyActions = allNonRecurring.filter((row) => {
    if (row.CLOSED !== "Y" || !row.CLOSED_DATE) return false;
    const closedYear = new Date(row.CLOSED_DATE).getFullYear();
    return closedYear === selectedYear;
  }).length;

  // Update summary display
  document.getElementById("openCount").textContent = openCount;
  document.getElementById("averageAge").textContent = averageAge;
  document.getElementById("yearlyCount").textContent = yearlyActions;
}

function displayInfrastructureTable(data) {
  const container = document.getElementById("infrastructureTableContainer");
  if (!container) return;

  const filteredData = getFilteredData(data, true);

  if (!filteredData || filteredData.length === 0) {
    container.innerHTML =
      '<p class="no-data-message">No infrastructure actions found for the selected criteria.</p>';
    return;
  }

  container.innerHTML = "";

  const table = document.createElement("table");
  table.className = "infrastructure-table";

  // Create header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const columns = [
    { key: "INPUT_ID", label: "ID", width: "80px" },
    { key: "INPUT_DATE", label: "Date", width: "100px" },
    { key: "AGE", label: "Age (Days)", width: "100px" },
    { key: "SUBJECT", label: "Subject", width: "120px" },
    { key: "ASSIGNED_TO", label: "Assigned To", width: "120px" },
    { key: "CLOSED", label: "Status", width: "80px" },
    { key: "CLOSED_DATE", label: "Closed Date", width: "100px" },
    { key: "INPUT_TEXT", label: "Details", width: "300px" },
  ];

  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.label;
    th.setAttribute(
      "style",
      `background-color: #2c3e50 !important; color: white !important; padding: 1rem !important; text-align: left !important; font-weight: 600 !important; letter-spacing: 0.5px !important; border-bottom: 2px solid #3498db !important; width: ${col.width} !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;`,
    );
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement("tbody");

  filteredData.forEach((row) => {
    const tr = document.createElement("tr");

    columns.forEach((col) => {
      const td = document.createElement("td");
      let value = row[col.key] || "";

      if (col.key === "AGE") {
        // Calculate age in days from INPUT_DATE
        if (row.INPUT_DATE) {
          const inputDate = new Date(row.INPUT_DATE);
          const today = new Date();
          const ageInDays = Math.floor(
            (today - inputDate) / (1000 * 60 * 60 * 24),
          );
          value = ageInDays.toString();
          td.textContent = value;

          // Add color coding based on age
          if (ageInDays > 60) {
            td.style.color = "#e74c3c";
            td.style.fontWeight = "bold";
          } else if (ageInDays > 30) {
            td.style.color = "#f39c12";
            td.style.fontWeight = "bold";
          }
        }
      } else if (col.key === "INPUT_DATE" || col.key === "CLOSED_DATE") {
        value = formatDate(value);
        td.textContent = value;
      } else if (col.key === "INPUT_ID") {
        const a = document.createElement("a");
        a.setAttribute("href", "input.html?id=" + row[col.key]);
        a.textContent = row[col.key];
        td.appendChild(a);
      } else if (col.key === "CLOSED") {
        const status = row[col.key] === "Y" ? "Closed" : "Open";
        td.textContent = status;
        if (row[col.key] === "Y") {
          td.style.color = "#27ae60";
          td.style.fontWeight = "bold";
        } else {
          td.style.color = "#e74c3c";
          td.style.fontWeight = "bold";
        }
      } else if (col.key === "INPUT_TEXT") {
        td.className = "truncate-text";
        td.textContent = value;
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

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function performSearch() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  const filter = searchInput.value.toLowerCase();
  const filteredData = getFilteredData(infrastructureData, true).filter(
    (row) => {
      const id = (row.INPUT_ID || "").toString().toLowerCase();
      const subject = (row.SUBJECT || "").toLowerCase();
      const assignedTo = (row.ASSIGNED_TO || "").toLowerCase();

      return (
        id.includes(filter) ||
        subject.includes(filter) ||
        assignedTo.includes(filter)
      );
    },
  );

  const container = document.getElementById("infrastructureTableContainer");
  if (!container) return;

  if (filteredData.length === 0) {
    container.innerHTML =
      '<p class="no-data-message">No matching infrastructure actions found.</p>';
    return;
  }

  // Rebuild table with filtered data
  container.innerHTML = "";
  const table = document.createElement("table");
  table.className = "infrastructure-table";

  // Create header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const columns = [
    { key: "INPUT_ID", label: "ID", width: "80px" },
    { key: "INPUT_DATE", label: "Date", width: "100px" },
    { key: "AGE", label: "Age (Days)", width: "100px" },
    { key: "SUBJECT", label: "Subject", width: "120px" },
    { key: "ASSIGNED_TO", label: "Assigned To", width: "120px" },
    { key: "CLOSED", label: "Status", width: "80px" },
    { key: "CLOSED_DATE", label: "Closed Date", width: "100px" },
    { key: "INPUT_TEXT", label: "Details", width: "300px" },
  ];

  columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.label;
    th.setAttribute(
      "style",
      `background-color: #2c3e50 !important; color: white !important; padding: 1rem !important; text-align: left !important; font-weight: 600 !important; letter-spacing: 0.5px !important; border-bottom: 2px solid #3498db !important; width: ${col.width} !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;`,
    );
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement("tbody");

  filteredData.forEach((row) => {
    const tr = document.createElement("tr");

    columns.forEach((col) => {
      const td = document.createElement("td");

      if (col.key === "AGE") {
        if (row.INPUT_DATE) {
          const inputDate = new Date(row.INPUT_DATE);
          const today = new Date();
          const ageInDays = Math.floor(
            (today - inputDate) / (1000 * 60 * 60 * 24),
          );
          td.textContent = ageInDays.toString();

          if (ageInDays > 60) {
            td.style.color = "#e74c3c";
            td.style.fontWeight = "bold";
          } else if (ageInDays > 30) {
            td.style.color = "#f39c12";
            td.style.fontWeight = "bold";
          }
        }
      } else if (col.key === "INPUT_DATE" || col.key === "CLOSED_DATE") {
        td.textContent = formatDate(row[col.key]);
      } else if (col.key === "INPUT_ID") {
        const a = document.createElement("a");
        a.setAttribute("href", "input.html?id=" + row[col.key]);
        a.textContent = row[col.key];
        td.appendChild(a);
      } else if (col.key === "CLOSED") {
        const status = row[col.key] === "Y" ? "Closed" : "Open";
        td.textContent = status;
        if (row[col.key] === "Y") {
          td.style.color = "#27ae60";
          td.style.fontWeight = "bold";
        } else {
          td.style.color = "#e74c3c";
          td.style.fontWeight = "bold";
        }
      } else if (col.key === "INPUT_TEXT") {
        td.className = "truncate-text";
        td.textContent = row[col.key] || "";
      } else {
        td.textContent = row[col.key] || "";
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

function printReport() {
  window.print();
}

function exportToCSV() {
  const filteredData = getFilteredData(infrastructureData, true);
  if (!filteredData || filteredData.length === 0) {
    alert("No data to export.");
    return;
  }

  const columns = [
    "INPUT_ID",
    "INPUT_DATE",
    "SUBJECT",
    "ASSIGNED_TO",
    "CLOSED",
    "CLOSED_DATE",
    "INPUT_TEXT",
  ];

  // Create CSV header
  const csvContent = [
    columns.join(","),
    ...filteredData.map((row) =>
      columns
        .map((col) => {
          let value = row[col] || "";
          // Escape quotes and wrap in quotes if contains comma
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    ),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "infrastructure-report.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
