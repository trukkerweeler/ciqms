import {
  loadHeaderFooter,
  getSessionUser,
  myport,
  getConfig,
  getApiUrl,
} from "./utils.mjs";

// Initialize header/footer
loadHeaderFooter();

// Configuration
const port = myport() || 3003;
const apiUrl = await getApiUrl();

// Replace hardcoded URLs with dynamic apiUrl
const url = `${apiUrl}/suppliers`;
let sortOrder = "asc";
let user; // Will be set in initialization
let config; // Will be set in initialization
let allSuppliers = []; // Store all suppliers for filtering

// Initialize handler function
async function initializeSuppliers() {
  console.log("[suppliers.mjs] Initializing suppliers");
  user = await getSessionUser();
  config = await getConfig();
  setupEventListeners();
  await loadSupplierData();
}

// Run initialization when DOM is ready
if (document.readyState === "loading") {
  console.log(
    "[suppliers.mjs] DOM still loading, waiting for DOMContentLoaded",
  );
  document.addEventListener("DOMContentLoaded", initializeSuppliers);
} else {
  console.log("[suppliers.mjs] DOM already loaded, initializing immediately");
  initializeSuppliers();
}

function setupEventListeners() {
  // Add Supplier button
  const addSupplierBtn = document.getElementById("addSupplierBtn");
  if (addSupplierBtn) {
    addSupplierBtn.addEventListener("click", openAddSupplierDialog);
  }

  // Close button for add supplier dialog
  const closeAddBtn = document.getElementById("closeAddSupplierBtn");
  if (closeAddBtn) {
    closeAddBtn.addEventListener("click", () => {
      document.getElementById("addSupplierDialog").close();
    });
  }

  // Save supplier form
  const saveSupplierBtn = document.getElementById("saveSupplierBtn");
  if (saveSupplierBtn) {
    saveSupplierBtn.addEventListener("click", saveSupplier);
  }

  // Close dialog on outside click for add supplier dialog
  const addSupplierDialog = document.getElementById("addSupplierDialog");
  if (addSupplierDialog) {
    addSupplierDialog.addEventListener("click", (e) => {
      if (e.target === addSupplierDialog) {
        addSupplierDialog.close();
      }
    });
  }

  // Status filter
  const statusFilter = document.getElementById("statusFilter");
  if (statusFilter) {
    statusFilter.addEventListener("change", filterSuppliers);
  }
}

async function openAddSupplierDialog() {
  const dialog = document.getElementById("addSupplierDialog");
  if (dialog) {
    // Reset form
    const form = document.getElementById("addSupplierForm");
    form.reset();

    dialog.showModal();
  }
}

async function saveSupplier(event) {
  event.preventDefault();
  const form = document.getElementById("addSupplierForm");
  const formData = new FormData(form);

  try {
    // Prepare current timestamp
    const requestDate = new Date();
    const createDate = requestDate.toISOString().slice(0, 19).replace("T", " ");

    // Build data object
    const dataJson = {
      CREATE_DATE: createDate,
      CREATE_BY: user || "TKENT",
      SUPP_CONT_NO: "1",
    };

    // Add form data with proper case handling
    for (let field of formData.keys()) {
      const value = formData.get(field);

      switch (field) {
        case "SUPPLIER_ID":
        case "STATE":
        case "SCOPE":
          dataJson[field] = value ? value.toUpperCase() : value;
          break;
        default:
          dataJson[field] = value;
      }
    }

    // Submit to main suppliers endpoint
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataJson),
    });

    if (response.ok) {
      // Submit to scope endpoint
      try {
        await fetch(url + "/scope", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataJson),
        });
      } catch (err) {
        console.log("Error submitting scope:", err);
      }

      // Submit to contact endpoint
      try {
        await fetch(url + "/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataJson),
        });
      } catch (err) {
        console.log("Error submitting contact:", err);
      }

      document.getElementById("addSupplierDialog").close();
      await loadSupplierData(); // Reload the data
    } else {
      const errorText = await response.text();
      alert(`Failed to save supplier: ${errorText}`);
    }
  } catch (error) {
    console.error("Error saving supplier:", error);
    alert("Failed to save supplier. Please try again.");
  }
}

async function loadSupplierData() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    allSuppliers = data; // Store all suppliers
    filterSuppliers(); // Apply current filter
  } catch (error) {
    console.error("Error loading supplier data:", error);
    document.getElementById("supplierTableContainer").innerHTML =
      '<p class="error">Failed to load supplier data. Please refresh the page.</p>';
  }
}

function filterSuppliers() {
  const statusFilter = document.getElementById("statusFilter");
  const filterValue = statusFilter ? statusFilter.value : "active";

  let filteredData;
  if (filterValue === "active") {
    filteredData = allSuppliers.filter((supplier) => supplier.STATUS === "A");
  } else {
    filteredData = allSuppliers;
  }

  displaySupplierTable(filteredData);
}

function displaySupplierTable(data) {
  const container = document.getElementById("supplierTableContainer");
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No supplier records found.</p>";
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

  // Get headers from first record
  const headers = [];
  for (let key in data[0]) {
    headers.push(formatFieldName(key));
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
  tbody.id = "supplierTableBody";

  data.forEach((item) => {
    const row = document.createElement("tr");

    // Apply row styling based on status (if enabled in config)
    if (config && config.ui && config.ui.enableRowColors) {
      if (item.STATUS === "A") {
        row.style.backgroundColor = "#d4edda"; // Green for approved
      } else if (item.STATUS === "I") {
        row.style.backgroundColor = "#f8d7da"; // Light red for inactive
      } else if (item.STATUS === "P") {
        row.style.backgroundColor = "#fff3cd"; // Yellow for pending
      }
    }

    const cells = [];
    for (let key in item) {
      let cellContent = "";

      if (item[key] !== null && item[key] !== undefined) {
        if (key === "CREATE_DATE") {
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
  container.innerHTML = "";
  container.appendChild(table);
}

function formatFieldName(fieldName) {
  return fieldName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function sortTable(columnIndex) {
  const tbody = document.getElementById("supplierTableBody");
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
