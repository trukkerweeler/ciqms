import { loadHeaderFooter, getUserValue, myport, getConfig } from "./utils.mjs";
import users from "./users.mjs";

// Initialize header/footer
loadHeaderFooter();

// Configuration
const port = myport() || 3003;
const url = `http://localhost:${port}/ncm`;
let sortOrder = "asc";
let user; // Will be set in initialization
let config; // Will be set in initialization

document.addEventListener("DOMContentLoaded", async function () {
  user = await getUserValue();
  config = await getConfig();
  setupEventListeners();
  // Add event listener for closed toggle
  const showClosedToggle = document.getElementById("showClosedToggle");
  if (showClosedToggle) {
    showClosedToggle.addEventListener("change", () => {
      loadNcmData();
    });
  }
  await loadNcmData();
  await loadSubjects(); // Load subjects for the dropdown
  await loadCauses(); // Load causes for the dropdown
});

function setupEventListeners() {
  // Add NCM button
  const addNcmBtn = document.getElementById("addNcmBtn");
  if (addNcmBtn) {
    addNcmBtn.addEventListener("click", openAddNcmDialog);
  }

  // Close button for add NCM dialog
  const closeAddBtn = document.getElementById("closeAddBtn");
  if (closeAddBtn) {
    closeAddBtn.addEventListener("click", () => {
      document.getElementById("addNcmDialog").close();
    });
  }

  // Save NCM form
  const saveNcmBtn = document.getElementById("saveNcmBtn");
  if (saveNcmBtn) {
    saveNcmBtn.addEventListener("click", saveNcm);
  }

  // Close button for RET reminder dialog
  const closeRetReminderBtn = document.getElementById("closeRetReminderBtn");
  if (closeRetReminderBtn) {
    closeRetReminderBtn.addEventListener("click", () => {
      document.getElementById("retReminderDialog").close();
    });
  }

  // Close dialog on outside click for add NCM dialog
  const addNcmDialog = document.getElementById("addNcmDialog");
  if (addNcmDialog) {
    addNcmDialog.addEventListener("click", (e) => {
      if (e.target === addNcmDialog) {
        addNcmDialog.close();
      }
    });
  }

  // Trend Dialog Event Listeners
  const closeTrendBtn = document.getElementById("closeTrendBtn");
  if (closeTrendBtn) {
    closeTrendBtn.addEventListener("click", () => {
      document.getElementById("trendDialog").close();
    });
  }

  const saveTrendBtn = document.getElementById("saveTrendBtn");
  if (saveTrendBtn) {
    saveTrendBtn.addEventListener("click", saveTrend);
  }

  // Close dialog on outside click for trend dialog
  const trendDialog = document.getElementById("trendDialog");
  if (trendDialog) {
    trendDialog.addEventListener("click", (e) => {
      if (e.target === trendDialog) {
        trendDialog.close();
      }
    });
  }
}

async function openAddNcmDialog() {
  const dialog = document.getElementById("addNcmDialog");
  if (dialog) {
    // Reset form and set today's date
    const form = document.getElementById("addNcmForm");
    form.reset();

    // Set today's date as default for NCM_DATE
    const today = new Date();
    document.getElementById("NCM_DATE").value = today
      .toISOString()
      .slice(0, 10);

    // Set due date to 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById("DUE_DATE").value = dueDate
      .toISOString()
      .slice(0, 10);

    dialog.showModal();
  }
}

// Check if user needs to see RET reminder today
async function checkAndShowRetReminder() {
  try {
    const checkResponse = await fetch(`${url}/check-ret-reminder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user: user || "TKENT", ncmCode: "RET" }),
    });

    const result = await checkResponse.json();

    if (result.showReminder) {
      // Show the reminder dialog
      const retReminderDialog = document.getElementById("retReminderDialog");
      if (retReminderDialog) {
        retReminderDialog.showModal();

        // Log that reminder was shown
        await fetch(`${url}/log-ret-reminder`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user: user || "TKENT", ncmCode: "RET" }),
        });
      }
    }
  } catch (error) {
    console.error("Error checking RET reminder:", error);
    // Don't block the workflow if reminder check fails
  }
}
async function saveNcm(event) {
  event.preventDefault();
  const form = document.getElementById("addNcmForm");
  const formData = new FormData(form);

  try {
    // Get next ID from server
    const nextIdResponse = await fetch(`${url}/nextId`);
    const nextId = await nextIdResponse.json();

    // Prepare current timestamp
    const currentDate = new Date();
    const myRequestDate = currentDate
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // Build data object
    const dataJson = {
      NCM_ID: nextId,
      CREATE_DATE: myRequestDate,
      CREATE_BY: user || "TKENT",
      STATUS: "OPEN",
      CLOSED: "N", // Default to 'N' (No) for new records
    };

    // Add form data with proper case handling
    for (let field of formData.keys()) {
      if (
        [
          "PEOPLE_ID",
          "ASSIGNED_TO",
          "PRODUCT_ID",
          "SUPPLIER_ID",
          "CUSTOMER_ID",
        ].includes(field)
      ) {
        const value = formData.get(field);
        dataJson[field] = value ? value.toUpperCase() : value;
      } else {
        dataJson[field] = formData.get(field);
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
      document.getElementById("addNcmDialog").close();
      await loadNcmData(); // Reload the data

      // Check if NCM_TYPE is RET and show reminder if needed
      if (dataJson.NCM_TYPE === "RET") {
        await checkAndShowRetReminder();
      }
    } else {
      const errorText = await response.text();
      alert(`Failed to save NCM: ${errorText}`);
    }
  } catch (error) {
    console.error("Error saving NCM:", error);
    alert("Failed to save NCM. Please try again.");
  }
}

async function loadNcmData() {
  try {
    const showClosedToggle = document.getElementById("showClosedToggle");
    const closedNOnly = showClosedToggle ? showClosedToggle.checked : false;
    // Always fetch all records
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    let data = await response.json();
    // If toggle is checked, filter to CLOSED === 'N' (open only)
    if (closedNOnly) {
      data = data.filter((item) => item.CLOSED === "N");
    }
    displayNcmTable(data);
  } catch (error) {
    console.error("Error loading NCM data:", error);
    document.getElementById("ncmTableContainer").innerHTML =
      '<p class="error">Failed to load NCM data. Please refresh the page.</p>';
  }
}

function displayNcmTable(data) {
  const container = document.getElementById("ncmTableContainer");
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No NCM records found.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "data-table";
  table.style.marginBottom = "0";

  // Create header
  const thead = document.createElement("thead");
  thead.style.position = "sticky";
  thead.style.top = "0";
  thead.style.zIndex = "1";

  const headerRow = document.createElement("tr");

  const headers = [
    "NCM ID",
    "Date",
    "Type",
    "Subject",
    "Assignee",
    "Due Date",
    "Product ID",
    "PO Number",
    "Trend",
    "Description",
    "Closed",
  ];

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
  tbody.id = "ncmTableBody";

  data.forEach((item) => {
    const row = document.createElement("tr");

    // Apply row styling based on CLOSED field (if enabled in config)
    if (config && config.ncm && config.ncm.enableRowColors) {
      if (item.CLOSED === "Y") {
        row.style.backgroundColor = "#d4edda";
      } else if (item.CLOSED === "N") {
        row.style.backgroundColor = "#f8d7da";
      }
    }

    row.innerHTML = `
      <td><a href="ncm.html?id=${item.NCM_ID}">${item.NCM_ID}</a></td>
      <td>${item.NCM_DATE ? formatDate(item.NCM_DATE) : ""}</td>
      <td>${item.NCM_TYPE || ""}</td>
      <td>${item.SUBJECT || ""}</td>
      <td>${item.ASSIGNED_TO || ""}</td>
      <td>${item.DUE_DATE ? formatDate(item.DUE_DATE) : ""}</td>
      <td>${item.PRODUCT_ID || ""}</td>
      <td>${item.PO_NUMBER || ""}</td>
      <td>${
        item.PROCESS_ID
          ? `<button type="button" class="btn-secondary" onclick="openTrendDialog('${item.NCM_ID}')"><!-- <span class=\"btn-icon\">📈</span> --> ${item.PROCESS_ID}</button>`
          : `<button type="button" class="btn-secondary" onclick="openTrendDialog('${item.NCM_ID}')">Edit</button>`
      }</td>
      <td>${truncateText(item.DESCRIPTION || "", 50)}</td>
      <td>${item.CLOSED === "Y" ? "Yes" : "No"}</td>
    `;

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.innerHTML = "";
  container.appendChild(table);
}

function truncateText(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function sortTable(columnIndex) {
  const tbody = document.getElementById("ncmTableBody");
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr"));
  const headerCells = document.querySelectorAll("thead th");

  // Toggle sort order
  sortOrder = sortOrder === "asc" ? "desc" : "asc";

  rows.sort((a, b) => {
    const aVal = a.cells[columnIndex].textContent.trim();
    const bVal = b.cells[columnIndex].textContent.trim();

    // Handle numeric columns
    if (columnIndex === 0) {
      // NCM ID
      const aNum = parseFloat(aVal) || 0;
      const bNum = parseFloat(bVal) || 0;
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
    }

    // Handle date columns
    if (columnIndex === 1 || columnIndex === 2) {
      // Date and Due Date
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

// Trend Dialog Functions
async function openTrendDialog(ncmId) {
  const dialog = document.getElementById("trendDialog");
  const titleElement = document.getElementById("trendDialogTitle");
  const formContainer = document.getElementById("trendFormContainer");

  if (!dialog || !titleElement || !formContainer) return;

  // Set title
  titleElement.textContent = `Edit Trend Data - NCM: ${ncmId}`;

  // Store NCM ID for later use
  dialog.dataset.ncmId = ncmId;

  try {
    // Fetch trend data
    const trendUrl = `http://localhost:${port}/trend/${ncmId}`;
    const response = await fetch(trendUrl, { method: "GET" });
    const records = await response.json();

    // Clear existing form content
    formContainer.innerHTML = "";

    if (records.length > 0) {
      // Generate form fields based on the data
      const data = records[0];

      for (let key in data) {
        if (key !== "NCM_ID") {
          const formGroup = document.createElement("div");
          formGroup.className = "form-group";

          const label = document.createElement("label");
          label.setAttribute("for", key);
          label.textContent = formatFieldName(key);

          const input = document.createElement("input");
          input.setAttribute("type", "text");
          input.setAttribute("id", key);
          input.setAttribute("name", key);
          input.value = data[key] || "";

          formGroup.appendChild(label);
          formGroup.appendChild(input);
          formContainer.appendChild(formGroup);
        }
      }
    } else {
      // No data found - create basic form with common fields
      const commonFields = [
        "PROCESS_ID",
        "CORRECTIVE_ID",
        "TREND_TYPE",
        "TREND_DESCRIPTION",
        "ROOT_CAUSE",
        "PREVENTIVE_ACTION",
        "SUPPLIER_ID",
        "CUSTOMER_ID",
      ];

      commonFields.forEach((fieldName) => {
        const formGroup = document.createElement("div");
        formGroup.className = "form-group";

        const label = document.createElement("label");
        label.setAttribute("for", fieldName);
        label.textContent = formatFieldName(fieldName);

        const input = document.createElement("input");
        input.setAttribute("type", "text");
        input.setAttribute("id", fieldName);
        input.setAttribute("name", fieldName);
        input.value = "";

        formGroup.appendChild(label);
        formGroup.appendChild(input);
        formContainer.appendChild(formGroup);
      });
    }

    dialog.showModal();
  } catch (error) {
    console.error("Error loading trend data:", error);
    alert("Failed to load trend data. Please try again.");
  }
}

async function saveTrend(event) {
  event.preventDefault();
  const dialog = document.getElementById("trendDialog");
  const form = document.getElementById("trendForm");
  const ncmId = dialog.dataset.ncmId;

  if (!ncmId) {
    alert("NCM ID not found");
    return;
  }

  const formData = new FormData(form);
  const data = {};

  // Convert form data to object
  for (let pair of formData.entries()) {
    data[pair[0]] = pair[1];
  }

  // Add metadata
  data.MODIFIED_BY = user || "TKENT";
  data.MODIFIED_DATE = new Date().toLocaleString();

  // Convert certain fields to uppercase
  if (data.CUSTOMER_ID) {
    data.CUSTOMER_ID = data.CUSTOMER_ID.toUpperCase();
  }
  if (data.SUPPLIER_ID) {
    data.SUPPLIER_ID = data.SUPPLIER_ID.toUpperCase();
  }

  try {
    // Save trend data
    const trendUrl = `http://localhost:${port}/trend/${ncmId}`;
    const response = await fetch(trendUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.affectedRows > 0) {
      // Handle corrective action link if provided
      if (data.CORRECTIVE_ID) {
        const corrData = { CORRECTIVE_ID: data.CORRECTIVE_ID };
        const corrUrl = `http://localhost:${port}/trend/${ncmId}/ncl`;

        await fetch(corrUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(corrData),
        });
      }

      dialog.close();
      await loadNcmData(); // Refresh the table
    } else {
      alert("Failed to update trend data");
    }
  } catch (error) {
    console.error("Error saving trend data:", error);
    alert("Failed to save trend data. Please try again.");
  }
}

function formatFieldName(fieldName) {
  return fieldName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// Make openTrendDialog globally available
window.openTrendDialog = openTrendDialog;

// Function to fetch subjects from the server for the dropdown
async function loadSubjects() {
  try {
    const subjectsUrl = `http://localhost:${port}/ncm/subjects`;
    const response = await fetch(subjectsUrl, { method: "GET" });

    if (!response.ok) {
      console.error("Response not ok:", response.status, response.statusText);
      populateSubjectDropdown(getHardcodedSubjects());
      return;
    }

    const subjects = await response.json();

    if (subjects.length === 0) {
      populateSubjectDropdown(getHardcodedSubjects());
      return;
    }

    populateSubjectDropdown(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    populateSubjectDropdown(getHardcodedSubjects());
  }
}

function populateSubjectDropdown(subjects) {
  const dropdown = document.getElementById("SUBJECT");
  if (!dropdown) return;

  // Clear existing options except the first one
  while (dropdown.children.length > 1) {
    dropdown.removeChild(dropdown.lastChild);
  }

  // Add subject options
  subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject.SUBJECT || subject;
    option.textContent = subject.DESCRIPTION || subject;
    dropdown.appendChild(option);
  });
}

function getHardcodedSubjects() {
  return [
    "Incorrect part shipped",
    "Missing hardware",
    "Damaged in shipment",
    "Wrong quantity",
    "Quality issue",
    "Documentation error",
    "Manufacturing defect",
    "Supplier quality issue",
  ];
}

// Function to fetch causes from the server for the dropdown
async function loadCauses() {
  try {
    const causesUrl = `http://localhost:${port}/causemaint/`;
    const response = await fetch(causesUrl, { method: "GET" });

    if (!response.ok) {
      console.error("Response not ok:", response.status, response.statusText);
      populateCauseDropdown(getHardcodedCauses());
      return;
    }

    const causes = await response.json();

    if (causes.length === 0) {
      populateCauseDropdown(getHardcodedCauses());
      return;
    }

    populateCauseDropdown(causes);
  } catch (error) {
    console.error("Error fetching causes:", error);
    populateCauseDropdown(getHardcodedCauses());
  }
}

function populateCauseDropdown(causes) {
  const dropdown = document.getElementById("CAUSE");
  if (!dropdown) return;

  // Clear existing options except the first one
  while (dropdown.children.length > 1) {
    dropdown.removeChild(dropdown.lastChild);
  }

  // Add cause options
  causes.forEach((cause) => {
    const option = document.createElement("option");
    option.value = cause.CAUSE || cause;
    option.textContent = cause.CAUSE
      ? `${cause.CAUSE} - ${cause.DESCRIPTION}`
      : cause;
    dropdown.appendChild(option);
  });
}

function getHardcodedCauses() {
  return [
    "Material defect",
    "Process error",
    "Equipment malfunction",
    "Operator error",
    "Design issue",
    "Supplier quality",
    "Handling damage",
    "Documentation error",
  ];
}
