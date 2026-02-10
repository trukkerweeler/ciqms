import {
  loadHeaderFooter,
  getUserValue,
  myport,
  getConfig,
  getApiUrl,
} from "./utils.mjs";

// Initialize header/footer
loadHeaderFooter();

// Configuration
const apiUrl = await getApiUrl();
const url = `${apiUrl}/supplierlist`;
const qmsUrl = `${apiUrl}/suppliers/qms`;
let sortOrder = "asc";
let user; // Will be set in initialization
let config; // Will be set in initialization

// Initialize handler function
async function initializeSupplierList() {
  console.log("[supplierlist.mjs] Initializing");
  user = await getUserValue();
  config = await getConfig();
  setupEventListeners();
  await loadSupplierListData();
}

// Run initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSupplierList);
} else {
  initializeSupplierList();
}

function setupEventListeners() {
  // Add QMS button
  const addQmsBtn = document.getElementById("addQmsBtn");
  if (addQmsBtn) {
    addQmsBtn.addEventListener("click", openAddQmsDialog);
  }

  // Close button for add QMS dialog
  const closeQmsBtn = document.getElementById("closeQmsBtn");
  if (closeQmsBtn) {
    closeQmsBtn.addEventListener("click", () => {
      document.getElementById("addQmsDialog").close();
    });
  }

  // Save QMS form
  const saveQmsBtn = document.getElementById("saveQmsBtn");
  if (saveQmsBtn) {
    saveQmsBtn.addEventListener("click", saveQms);
  }

  // Close dialog on outside click for add QMS dialog
  const addQmsDialog = document.getElementById("addQmsDialog");
  if (addQmsDialog) {
    addQmsDialog.addEventListener("click", (e) => {
      if (e.target === addQmsDialog) {
        addQmsDialog.close();
      }
    });
  }
}

async function openAddQmsDialog() {
  const dialog = document.getElementById("addQmsDialog");
  if (dialog) {
    // Reset form
    const form = document.getElementById("addQmsForm");
    form.reset();

    dialog.showModal();
  }
}

async function saveQms(event) {
  event.preventDefault();
  const form = document.getElementById("addQmsForm");
  const formData = new FormData(form);

  try {
    // Build data object
    const dataJson = {};

    // Add form data with proper case handling
    for (let field of formData.keys()) {
      const value = formData.get(field);

      switch (field) {
        case "STATE":
        case "SCOPE":
          dataJson[field] = value ? value.toUpperCase() : value;
          break;
        default:
          dataJson[field] = value;
      }
    }

    // Submit to QMS endpoint
    const response = await fetch(qmsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataJson),
    });

    if (response.ok) {
      document.getElementById("addQmsDialog").close();
      await loadSupplierListData(); // Reload the data
    } else {
      const errorText = await response.text();
      alert(`Failed to save QMS certification: ${errorText}`);
    }
  } catch (error) {
    console.error("Error saving QMS certification:", error);
    alert("Failed to save QMS certification. Please try again.");
  }
}

async function loadSupplierListData() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    displaySupplierListTable(data);
  } catch (error) {
    console.error("Error loading supplier list data:", error);
    document.getElementById("main").innerHTML =
      '<p class="error">Failed to load supplier list data. Please refresh the page.</p>';
  }
}

function displaySupplierListTable(data) {
  const main = document.querySelector("main");
  if (!main) return;

  if (!data || data.length === 0) {
    main.innerHTML = "<p>No supplier records found.</p>";
    return;
  }

  // Create table container for scrolling
  const tableContainer = document.createElement("div");
  tableContainer.setAttribute("class", "table-container");
  tableContainer.style.maxHeight = "calc(80vh - 80px)";
  tableContainer.style.overflowY = "auto";
  tableContainer.style.marginBottom = "2rem";

  const table = document.createElement("table");
  table.className = "data-table";
  table.style.marginBottom = "0";

  // Create header
  const thead = document.createElement("thead");
  thead.style.position = "sticky";
  thead.style.top = "0";
  thead.style.zIndex = "1";

  const headerRow = document.createElement("tr");

  // Get headers from first record, excluding 'rn' column
  const headers = [];
  for (let key in data[0]) {
    if (key !== "rn") {
      headers.push(formatFieldName(key));
    }
  }

  headers.forEach((header, index) => {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.cursor = "pointer";
    th.addEventListener("click", () => sortTable(index));
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement("tbody");
  tbody.id = "supplierListTableBody";

  data.forEach((item) => {
    const row = document.createElement("tr");

    // Check if QMS certification is expired
    let isExpired = false;
    if (item.EXPIRY_DATE) {
      const today = new Date();
      const expiryDate = new Date(item.EXPIRY_DATE);
      isExpired = expiryDate < today;
    }

    // Apply row styling for expired certifications
    if (isExpired) {
      row.classList.add("highlight"); // Using existing highlight class for expired items
      row.style.backgroundColor = "#f8d7da"; // Light red for expired
    }

    const cells = [];
    for (let key in item) {
      if (key === "rn") continue; // Skip the row number column

      let cellContent = "";

      if (item[key] !== null && item[key] !== undefined) {
        // Handle date fields
        if (key.includes("DATE") || key === "EXPIRY_DATE") {
          cellContent = item[key].slice(0, 10);
        } else {
          cellContent = item[key] || "";
        }
      } else {
        cellContent = "";
      }

      cells.push(cellContent);
    }

    cells.forEach((cellContent) => {
      const td = document.createElement("td");
      td.textContent = cellContent;
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  main.innerHTML = "";
  main.appendChild(table);
}

function formatFieldName(fieldName) {
  return fieldName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function sortTable(columnIndex) {
  const tbody = document.getElementById("supplierListTableBody");
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr"));
  const headerCells = document.querySelectorAll("thead th");

  // Toggle sort order
  sortOrder = sortOrder === "asc" ? "desc" : "asc";

  rows.sort((a, b) => {
    const aVal = a.cells[columnIndex].textContent.trim();
    const bVal = b.cells[columnIndex].textContent.trim();

    // Handle date columns
    if (aVal.match(/^\d{4}-\d{2}-\d{2}/) && bVal.match(/^\d{4}-\d{2}-\d{2}/)) {
      const aDate = new Date(aVal) || new Date(0);
      const bDate = new Date(bVal) || new Date(0);
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
    }

    // Handle text columns
    return sortOrder === "asc"
      ? aVal.localeCompare(bVal)
      : bVal.localeCompare(aVal);
  });

  // Clear tbody and append sorted rows
  tbody.innerHTML = "";
  rows.forEach((row) => tbody.appendChild(row));

  // Update sort indicators
  updateSortIndicators(headerCells, columnIndex);
}

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
