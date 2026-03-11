import {
  loadHeaderFooter,
  getSessionUser,
  myport,
  getApiUrl,
} from "./utils.mjs";

// Initialize header/footer
loadHeaderFooter();

// Configuration
const apiUrl = await getApiUrl();
const url = `${apiUrl}/project`;
const skippers = ["ENTITY_ID", "MODIFIED_DATE", "MODIFIED_BY", "COST_SAVINGS"];
let sortOrder = "asc";
let user; // Will be set in initialization

// Initialize handler function
async function initializeProjects() {
  console.log("[projects.mjs] Initializing");
  user = await getSessionUser();
  setupEventListeners();
  await loadProjectData();
}

// Run initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeProjects);
} else {
  initializeProjects();
}

function setupEventListeners() {
  // Add Project button
  const addProjectBtn = document.getElementById("addProjectBtn");
  if (addProjectBtn) {
    addProjectBtn.addEventListener("click", openAddProjectDialog);
  }

  // Close button for add project dialog
  const closeAddBtn = document.getElementById("closeAddProjectBtn");
  if (closeAddBtn) {
    closeAddBtn.addEventListener("click", () => {
      document.getElementById("addProjectDialog").close();
    });
  }

  // Save project form
  const saveProjectBtn = document.getElementById("saveProjectBtn");
  if (saveProjectBtn) {
    saveProjectBtn.addEventListener("click", saveProject);
  }

  // Close dialog on outside click for add project dialog
  const addProjectDialog = document.getElementById("addProjectDialog");
  if (addProjectDialog) {
    addProjectDialog.addEventListener("click", (e) => {
      if (e.target === addProjectDialog) {
        addProjectDialog.close();
      }
    });
  }
}

async function openAddProjectDialog() {
  const dialog = document.getElementById("addProjectDialog");
  if (dialog) {
    // Reset form
    const form = document.getElementById("addProjectForm");
    form.reset();

    dialog.showModal();
  }
}

async function saveProject(event) {
  event.preventDefault();
  const form = document.getElementById("addProjectForm");
  const formData = new FormData(form);

  try {
    // Prepare current timestamp
    const mytoday = new Date();
    const myCreateDate = mytoday.toISOString().slice(0, 10);

    // Build data object
    const dataJson = {
      CREATE_DATE: myCreateDate,
      CREATE_BY: user || "TKENT",
      CLOSED: "N",
    };

    // Add form data with proper case handling
    for (let field of formData.keys()) {
      const value = formData.get(field);

      switch (field) {
        case "LEADER":
        case "ASSIGNED_TO":
        case "SUBJECT":
        case "PROJECT_ID":
        case "PROJECT_TYPE":
          dataJson[field] = value ? value.toUpperCase() : value;
          break;
        default:
          if (field.endsWith("_DATE")) {
            dataJson[field] = value ? value.slice(0, 10) : value;
          } else {
            dataJson[field] = value;
          }
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataJson),
    });

    if (response.ok) {
      document.getElementById("addProjectDialog").close();
      await loadProjectData(); // Reload the data
    } else {
      const errorText = await response.text();
      alert(`Failed to save project: ${errorText}`);
    }
  } catch (error) {
    console.error("Error saving project:", error);
    alert("Failed to save project. Please try again.");
  }
}

async function loadProjectData() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    displayProjectTable(data);
  } catch (error) {
    console.error("Error loading project data:", error);
    document.getElementById("projectTableContainer").innerHTML =
      '<p class="error">Failed to load project data. Please refresh the page.</p>';
  }
}

function displayProjectTable(data) {
  const container = document.getElementById("projectTableContainer");
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No project records found.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "data-table";
  table.style.marginBottom = "0";

  // Get headers from first record, excluding skipped fields
  const headers = [];
  for (let key in data[0]) {
    if (!skippers.includes(key)) {
      headers.push(formatFieldName(key));
    }
  }

  // Create colgroup with saved column widths
  const colgroup = document.createElement("colgroup");
  const columnWidths = getProjectColumnWidths(headers.length);
  columnWidths.forEach((width) => {
    const col = document.createElement("col");
    col.style.width = width;
    colgroup.appendChild(col);
  });
  table.appendChild(colgroup);

  // Create header
  const thead = document.createElement("thead");
  thead.style.position = "sticky";
  thead.style.top = "0";
  thead.style.zIndex = "1";

  const headerRow = document.createElement("tr");

  headers.forEach((header, index) => {
    const th = document.createElement("th");
    const span = document.createElement("span");
    span.textContent = header;
    span.style.display = "block";
    span.style.cursor = "pointer";
    span.addEventListener("click", () => sortTable(index));
    th.appendChild(span);

    // Add resize handle
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "column-resize-handle";
    resizeHandle.style.width = "4px";
    resizeHandle.style.height = "100%";
    resizeHandle.style.position = "absolute";
    resizeHandle.style.right = "0";
    resizeHandle.style.top = "0";
    resizeHandle.style.cursor = "col-resize";
    resizeHandle.style.backgroundColor = "#ccc";
    resizeHandle.style.userSelect = "none";
    resizeHandle.addEventListener("mouseenter", () => {
      resizeHandle.style.backgroundColor = "#0066cc";
    });
    resizeHandle.addEventListener("mouseleave", () => {
      resizeHandle.style.backgroundColor = "#ccc";
    });
    th.style.position = "relative";
    th.appendChild(resizeHandle);

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement("tbody");
  tbody.id = "projectTableBody";

  data.forEach((item) => {
    const row = document.createElement("tr");

    const cells = [];
    for (let key in item) {
      if (!skippers.includes(key)) {
        let cellContent = "";

        if (item[key] !== null) {
          if (key.endsWith("DATE") && key.length > 4 && item[key] !== null) {
            cellContent = item[key].slice(0, 10);
          } else if (key === "PROJECT_ID") {
            cellContent = `<a href="project.html?id=${item[key]}">${item[key]}</a>`;
          } else {
            cellContent = item[key] || "";
          }
        } else {
          cellContent = "";
        }

        cells.push(cellContent);
      }
    }

    cells.forEach((cellContent) => {
      const td = document.createElement("td");
      td.innerHTML = cellContent;
      row.appendChild(td);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.innerHTML = "";
  container.appendChild(table);

  // Initialize column resizing
  initializeProjectColumnResizing();
}

function formatFieldName(fieldName) {
  return fieldName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function sortTable(columnIndex) {
  const tbody = document.getElementById("projectTableBody");
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
    // Remove existing sort indicators by removing the span content
    const span = th.querySelector("span");
    if (span) {
      span.textContent = span.textContent.replace(/ [↑↓]$/, "");

      // Add indicator to active column
      if (index === activeColumnIndex) {
        const indicator = sortOrder === "asc" ? " ↑" : " ↓";
        span.textContent += indicator;
      }
    }
  });
}

// ==================================================
// Column width management functions
function getProjectColumnWidths(columnCount) {
  const saved = localStorage.getItem("project_column_widths");
  if (saved) {
    const widths = JSON.parse(saved);
    if (widths.length === columnCount) {
      return widths;
    }
  }
  // Default: all columns auto
  return Array(columnCount).fill("auto");
}

function saveProjectColumnWidths(widths) {
  localStorage.setItem("project_column_widths", JSON.stringify(widths));
}

function initializeProjectColumnResizing() {
  const table = document.querySelector(".data-table");
  if (!table) return;

  const headerCells = table.querySelectorAll("thead th");
  const cols = table.querySelectorAll("colgroup col");

  headerCells.forEach((th, index) => {
    const handle = th.querySelector(".column-resize-handle");
    if (!handle) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    handle.addEventListener("mousedown", (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = th.offsetWidth;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + deltaX);

      if (cols[index]) {
        cols[index].style.width = newWidth + "px";
      }
    });

    document.addEventListener("mouseup", () => {
      if (isResizing) {
        isResizing = false;
        // Save column widths to localStorage
        const widths = Array.from(cols).map((col) => col.style.width || "auto");
        saveProjectColumnWidths(widths);
      }
    });
  });
}
