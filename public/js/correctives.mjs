import { loadHeaderFooter, getApiUrl, getUserValue } from "./utils.mjs";
import { calculateDaysOverdue, getRowColor } from "./escalation-utils.mjs";

// Initialize header/footer
loadHeaderFooter();

// Configuration - will be set in DOMContentLoaded
let url = "";
let apiUrl = ""; // Module-level variable for API URL
let sortOrder = "asc";

// Global variables - will be initialized on DOMContentLoaded
let dialog, addButton, cancelButton, form, user;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Get the dynamic API URL
    apiUrl = await getApiUrl();
    url = `${apiUrl}/corrective`;

    // Initialize DOM elements
    dialog = document.querySelector("dialog[create-corrective-dialog]");
    addButton = document.getElementById("btnAddCorrective");
    cancelButton = document.getElementById("cancel-corrective-dialog");
    form = document.getElementById("corrective-form");

    // Get current user
    user = await getUserValue();

    // Verify all required elements exist
    if (!dialog || !addButton || !cancelButton || !form) {
      console.error("Required dialog elements not found:", {
        dialog: !!dialog,
        addButton: !!addButton,
        cancelButton: !!cancelButton,
        form: !!form,
      });
      return;
    }

    // Load initial data
    await loadCorrectiveData();

    // Setup dialog event listeners
    setupDialogHandlers();

    // Set form defaults
    setupFormDefaults();
  } catch (error) {
    console.error("Error initializing correctives page:", error);
  }
});

/**
 * Load corrective data from the server and display it in a table
 */
async function loadCorrectiveData() {
  try {
    // console.log("Fetching corrective data from:", url);
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // console.log("Corrective data received:", data);

    if (data && data.length > 0) {
      createTable(data);
    } else {
      console.log("No corrective data found");
      document.querySelector("main").innerHTML =
        "<p>No corrective records found.</p>";
    }
  } catch (error) {
    console.error("Error fetching corrective data:", error);
    document.querySelector("main").innerHTML =
      "<p>Error loading corrective records.</p>";
  }
}

/**
 * Setup event handlers for the dialog and form interactions
 */
function setupDialogHandlers() {
  // Open dialog
  addButton.addEventListener("click", () => {
    dialog.showModal();
  });

  // Close dialog on cancel button
  cancelButton.addEventListener("click", () => {
    closeDialog();
  });

  // Close dialog on outside click
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      closeDialog();
    }
  });

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleFormSubmission();
  });

  // Handle ESC key to close dialog
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDialog();
    }
  });
}

/**
 * Close dialog and reset form to defaults
 */
function closeDialog() {
  dialog.close();
  form.reset();
  setupFormDefaults();
}

/**
 * Set default values for form fields
 */
function setupFormDefaults() {
  // Set date to today
  const today = new Date().toISOString().slice(0, 10);
  const dateField = document.getElementById("corrdate");
  if (dateField) {
    dateField.value = today;
  }

  // Set requestor to current user
  const reqByField = document.getElementById("reqby");
  if (reqByField && user) {
    reqByField.value = user;
  }
}

/**
 * Handle form submission to create a new corrective record
 */
async function handleFormSubmission() {
  try {
    const formData = new FormData(form);

    // Get next ID
    const nextIdResponse = await fetch(`${url}/nextId`, { method: "GET" });
    if (!nextIdResponse.ok) {
      throw new Error("Failed to get next ID");
    }
    const nextId = await nextIdResponse.json();

    // Prepare dates
    const requestDate = new Date().toISOString().slice(0, 19).replace("T", " ");
    let dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 21); // Default 21 days from today
    dueDate = dueDate.toISOString().slice(0, 19).replace("T", " ");

    // Build data object
    const dataJson = {
      CORRECTIVE_ID: nextId,
      CREATE_DATE: requestDate,
      DUE_DATE: dueDate,
      CREATE_BY: user,
      CLOSED: "N",
    };

    // Add form fields to data object
    for (const field of formData.keys()) {
      const value = formData.get(field);
      // Convert specific fields to uppercase
      if (["REQUEST_BY", "ASSIGNED_TO"].includes(field)) {
        dataJson[field] = value.toUpperCase();
      } else {
        dataJson[field] = value;
      }
    }

    console.log("Submitting corrective data:", dataJson);

    // Submit data to server
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataJson),
    });

    if (response.ok) {
      // Success - close dialog and reload data
      closeDialog();
      await loadCorrectiveData();
      console.log("Corrective record created successfully");
    } else {
      const errorText = await response.text();
      throw new Error(`Failed to create corrective record: ${errorText}`);
    }
  } catch (error) {
    console.error("Error creating corrective record:", error);
    alert("Error creating corrective record. Please try again.");
  }
}

/**
 * Create and display a sortable table with the corrective data
 * @param {Array} data - Array of corrective records
 */
function createTable(data) {
  if (!data || data.length === 0) {
    document.querySelector("main").innerHTML =
      "<p>No corrective records found.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "table table-striped table-bordered table-hover";
  table.style.marginBottom = "0";

  const headers = Object.keys(data[0]);

  // Create sticky header
  const thead = createTableHeader(headers, table);
  table.appendChild(thead);

  // Create table body with data rows
  const tbody = createTableBody(data, headers);
  table.appendChild(tbody);

  // Create scrollable container
  const tableContainer = createTableContainer();
  tableContainer.appendChild(table);

  // Replace main content with the new table
  const main = document.querySelector("main");
  main.innerHTML = "";
  main.appendChild(tableContainer);
}

/**
 * Create table header with sortable columns
 * @param {Array} headers - Column headers
 * @param {HTMLElement} table - Table element for sorting reference
 * @returns {HTMLElement} - Table header element
 */
function createTableHeader(headers, table) {
  const thead = document.createElement("thead");
  thead.style.position = "sticky";
  thead.style.top = "0";
  thead.style.backgroundColor = "#f8f9fa";
  thead.style.zIndex = "10";

  const headerRow = document.createElement("tr");

  headers.forEach((header) => {
    const th = document.createElement("th");
    th.style.cursor = "pointer";
    th.title = "Click to sort";

    // Apply header aliases for better display
    const displayHeader = getHeaderDisplayName(header);
    th.textContent = displayHeader;

    // Add click handler for sorting
    th.addEventListener("click", () => sortTable(table, displayHeader));
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  return thead;
}

/**
 * Create table body with data rows
 * @param {Array} data - Data records
 * @param {Array} headers - Column headers
 * @returns {HTMLElement} - Table body element
 */
function createTableBody(data, headers) {
  const tbody = document.createElement("tbody");

  data.forEach((item) => {
    const row = document.createElement("tr");

    // Apply escalation color
    const daysOverdue = calculateDaysOverdue(item.DUE_DATE);
    getRowColor(item, "CORRECTIVE", daysOverdue).then((color) => {
      if (color) {
        row.style.backgroundColor = color;
      }
    });

    headers.forEach((header) => {
      const td = document.createElement("td");
      const cellValue = item[header];

      // Format cell content based on data type
      if (header.toLowerCase().includes("date")) {
        td.textContent = formatDate(cellValue);
      } else if (header === "CORRECTIVE_ID") {
        td.innerHTML = `<a href="${apiUrl}/corrective.html?id=${cellValue}">${cellValue}</a>`;
      } else {
        td.textContent = cellValue || "";
      }

      row.appendChild(td);
    });

    // Make row clickable for full record view
    row.addEventListener("click", (e) => {
      if (e.target.tagName !== "A") {
        // Navigate to detail page if not clicking on link
        const correctiveId = item.CORRECTIVE_ID;
        window.location.href = `${apiUrl}/corrective.html?id=${correctiveId}`;
      }
    });
    row.style.cursor = "pointer";

    tbody.appendChild(row);
  });

  return tbody;
}

/**
 * Create scrollable container for the table
 * @returns {HTMLElement} - Table container element
 */
function createTableContainer() {
  const tableContainer = document.createElement("div");
  tableContainer.className = "table-container";
  tableContainer.style.maxHeight = "calc(80vh - 60px)";
  tableContainer.style.overflowY = "auto";
  tableContainer.style.overflowX = "auto";
  tableContainer.style.border = "1px solid #ddd";
  tableContainer.style.borderRadius = "4px";
  tableContainer.style.marginTop = "10px";
  tableContainer.style.marginBottom = "80px";

  return tableContainer;
}

/**
 * Get display name for table headers
 * @param {string} header - Original header name
 * @returns {string} - Display name for header
 */
function getHeaderDisplayName(header) {
  const headerAliases = {
    USER_DEFINED_1: "UD1",
    USER_DEFINED_2: "UD2",
  };

  return headerAliases[header] || header;
}

/**
 * Format date values for display
 * @param {string|null} dateValue - Date value to format
 * @returns {string} - Formatted date string
 */
function formatDate(dateValue) {
  if (!dateValue) return "";

  try {
    return new Date(dateValue).toLocaleDateString();
  } catch (error) {
    console.warn("Invalid date value:", dateValue);
    return "";
  }
}

/**
 * Sort table by the specified column
 * @param {HTMLElement} table - Table element to sort
 * @param {string} column - Column name to sort by
 */
function sortTable(table, column) {
  const rows = Array.from(table.querySelectorAll("tbody tr"));
  const headerCells = Array.from(table.querySelectorAll("th"));
  const columnIndex = headerCells.findIndex((th) => th.textContent === column);

  if (columnIndex === -1) {
    console.warn("Column not found for sorting:", column);
    return;
  }

  // Sort rows based on column content
  const sortedRows = rows.sort((a, b) => {
    const aText = a.children[columnIndex]?.textContent || "";
    const bText = b.children[columnIndex]?.textContent || "";

    // Try numeric comparison first
    const aNum = parseFloat(aText);
    const bNum = parseFloat(bText);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
    }

    // Fall back to text comparison
    return sortOrder === "asc"
      ? aText.localeCompare(bText, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      : bText.localeCompare(aText, undefined, {
          numeric: true,
          sensitivity: "base",
        });
  });

  // Update table body with sorted rows
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  sortedRows.forEach((row) => tbody.appendChild(row));

  // Update sort indicators
  updateSortIndicators(headerCells, columnIndex);

  // Toggle sort order for next click
  sortOrder = sortOrder === "asc" ? "desc" : "asc";
}

/**
 * Update visual sort indicators on table headers
 * @param {Array} headerCells - Array of header cell elements
 * @param {number} activeColumnIndex - Index of currently sorted column
 */
function updateSortIndicators(headerCells, activeColumnIndex) {
  headerCells.forEach((th, index) => {
    // Remove existing sort indicators
    th.textContent = th.textContent.replace(/ [↑↓]$/, "");

    // Add indicator to active column
    if (index === activeColumnIndex) {
      const indicator = sortOrder === "asc" ? " ↑" : " ↓";
      th.textContent += indicator;
    }
  });
}
