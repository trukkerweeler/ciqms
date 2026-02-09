import {
  loadHeaderFooter,
  getDocType,
  getUserValue,
  myport,
  getApiUrl,
} from "./utils.mjs";

// Initialize header/footer
loadHeaderFooter();

// Configuration
const apiUrl = await getApiUrl();
const url = `${apiUrl}/sysdocs`;
const url2 = `${apiUrl}/docsavail`;
let sortOrder = "asc";

// Global variables - will be initialized on DOMContentLoaded
let dialog, addButton, cancelButton, form, user;
let documentsData = []; // Store original data for filtering

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Initialize DOM elements
    dialog = document.querySelector("dialog[add-document-dialog]");
    addButton = document.getElementById("btnAddDocument");
    cancelButton = document.getElementById("cancel-document-dialog");
    form = document.getElementById("document-form");

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
    await loadDocumentData();

    // Setup dialog event listeners
    setupDialogHandlers();

    // Set form defaults
    setupFormDefaults();
  } catch (error) {
    console.error("Error initializing documents page:", error);
  }
});

/**
 * Load document data from the server and display it in a table
 */
async function loadDocumentData() {
  try {
    // console.log("Fetching document data from:", url);
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // console.log("Document data received:", data);

    if (data && data.length > 0) {
      documentsData = data; // Store for filtering
      createTable(data);
    } else {
      console.log("No document data found");
      document.querySelector("main").innerHTML =
        "<p>No document records found.</p>";
    }
  } catch (error) {
    console.error("Error fetching document data:", error);
    document.querySelector("main").innerHTML =
      "<p>Error loading document records.</p>";
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
  // Set issue date to today
  const today = new Date().toISOString().slice(0, 10);
  const issueDateField = document.getElementById("issue_date");
  if (issueDateField) {
    issueDateField.value = today;
  }
}

/**
 * Handle form submission to create a new document record
 */
async function handleFormSubmission() {
  try {
    const formData = new FormData(form);
    const requestDate = new Date();
    const createDate = requestDate.toISOString().slice(0, 19).replace("T", " ");

    // Build data object with required fields
    const docId = formData.get("document_id");
    const dataJson = {
      document_id: docId,
      document_name: formData.get("document_name"),
      DOCUMENT_TYPE: getDocType(docId),
      subject: formData.get("subject") || formData.get("document_name"),
      reference: formData.get("reference") || "",
      status: formData.get("status") || "C",
      doc_rev: formData.get("doc_rev") || "0",
      issue_date: formData.get("issue_date"),
      CHECKED_OUT: "N",
      AUDIT_RESPONSIBLE: "I",
      CREATE_BY: user,
      CREATE_DATE: createDate,
    };

    console.log("Submitting document data:", dataJson);

    // Submit to first endpoint
    try {
      const response1 = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataJson),
      });

      if (!response1.ok) {
        throw new Error(`HTTP error! status: ${response1.status}`);
      }

      console.log("Success (sysdocs):", JSON.stringify(dataJson));
    } catch (err) {
      console.error("Error (sysdocs):", err);
      throw err;
    }

    // Submit to second endpoint
    try {
      const response2 = await fetch(url2, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataJson),
      });

      if (!response2.ok) {
        throw new Error(`HTTP error! status: ${response2.status}`);
      }

      console.log("Success (docsavail):", JSON.stringify(dataJson));
    } catch (err) {
      console.error("Error (docsavail):", err);
      throw err;
    }

    // Success - close dialog and reload data
    closeDialog();
    await loadDocumentData();

    console.log("Document record created successfully");
  } catch (error) {
    console.error("Error creating document record:", error);
    alert("Error creating document record. Please try again.");
  }
}

/**
 * Create and display a sortable table with the document data
 * @param {Array} data - Array of document records
 */
function createTable(data) {
  if (!data || data.length === 0) {
    document.querySelector("main").innerHTML =
      "<p>No document records found.</p>";
    return;
  }

  const main = document.querySelector("main");
  main.innerHTML = "";

  // Create filter container
  const filterContainer = document.createElement("div");
  filterContainer.style.marginBottom = "15px";
  filterContainer.style.display = "flex";
  filterContainer.style.alignItems = "center";
  filterContainer.style.gap = "10px";

  const filterLabel = document.createElement("label");
  filterLabel.textContent = "Filter by Document Name:";
  filterLabel.style.whiteSpace = "nowrap";

  const filterInput = document.createElement("input");
  filterInput.type = "text";
  filterInput.id = "documentNameFilter";
  filterInput.placeholder = "Search documents...";
  filterInput.style.padding = "0.4rem 0.6rem";
  filterInput.style.border = "1px solid #ccc";
  filterInput.style.borderRadius = "4px";
  filterInput.style.fontSize = "0.9em";
  filterInput.style.minWidth = "250px";

  filterContainer.appendChild(filterLabel);
  filterContainer.appendChild(filterInput);
  main.appendChild(filterContainer);

  // Add filter event listener
  filterInput.addEventListener("input", () => {
    const filterValue = filterInput.value.toLowerCase();
    const filteredData = documentsData.filter((doc) => {
      return Object.values(doc).some((value) =>
        (value ?? "").toString().toLowerCase().includes(filterValue),
      );
    });
    renderDocumentTable(filteredData);
  });

  // Render initial table
  renderDocumentTable(data);
}

/**
 * Render document table with the provided data
 * @param {Array} data - Array of document records to display
 */
function renderDocumentTable(data) {
  const main = document.querySelector("main");
  let tableContainer = main.querySelector(".table-container");

  // Remove existing table if present
  if (tableContainer) {
    tableContainer.remove();
  }

  const table = document.createElement("table");
  table.className = "table table-striped table-bordered table-hover";
  table.style.marginBottom = "0";

  const headers = Object.keys(data[0] || {});

  // Create sticky header
  const thead = createTableHeader(headers, table);
  table.appendChild(thead);

  // Create table body with data rows
  const tbody = createTableBody(data, headers);
  table.appendChild(tbody);

  // Create scrollable container
  tableContainer = createTableContainer();
  tableContainer.appendChild(table);

  // Append table to main
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

    headers.forEach((header) => {
      const td = document.createElement("td");
      const cellValue = item[header];

      // Format cell content based on data type
      if (header.toLowerCase().includes("date")) {
        td.textContent = formatDate(cellValue);
      } else if (header === "DOCUMENT_ID") {
        td.innerHTML = `<a href="document.html?document_id=${cellValue}" target="_blank">${cellValue}</a>`;
      } else {
        td.textContent = cellValue || "";
      }

      row.appendChild(td);
    });

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
    DOCUMENT_ID: "Doc ID",
    DOCUMENT_NAME: "Name",
    DOCUMENT_TYPE: "Type",
    ISSUE_DATE: "Issue Date",
    CREATE_DATE: "Created",
    CREATE_BY: "Created By",
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
