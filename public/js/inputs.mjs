import { loadHeaderFooter, getUserValue, myport, getConfig } from "./utils.mjs";
import users from "./users.mjs";

// Initialize header/footer
loadHeaderFooter();

// Configuration
const port = myport() || 3003;
const url = `http://localhost:${port}/input`;
let sortOrder = "asc";
let user; // Will be set in initialization
let userEmail; // Will be set in initialization
let config; // Will be set in initialization

document.addEventListener("DOMContentLoaded", async function () {
  user = await getUserValue();
  userEmail = users[user];
  config = await getConfig();
  setupEventListeners();
  await loadInputData();
});

function setupEventListeners() {
  // Add Input button
  const addInputBtn = document.getElementById("addInputBtn");
  if (addInputBtn) {
    addInputBtn.addEventListener("click", openAddInputDialog);
  }

  // Close button for add input dialog
  const closeAddBtn = document.getElementById("closeAddInputBtn");
  if (closeAddBtn) {
    closeAddBtn.addEventListener("click", () => {
      document.getElementById("addInputDialog").close();
    });
  }

  // Save input form
  const saveInputBtn = document.getElementById("saveInputBtn");
  if (saveInputBtn) {
    saveInputBtn.addEventListener("click", saveInput);
  }

  // Close dialog on outside click for add input dialog
  const addInputDialog = document.getElementById("addInputDialog");
  if (addInputDialog) {
    addInputDialog.addEventListener("click", (e) => {
      if (e.target === addInputDialog) {
        addInputDialog.close();
      }
    });
  }

  // Subject filter functionality
  const subjectFilter = document.querySelector("#subjectFilter input");
  if (subjectFilter) {
    subjectFilter.addEventListener("keyup", function (event) {
      const filter = event.target.value.toLowerCase();
      const rows = document.querySelectorAll("tbody tr");

      rows.forEach((row) => {
        const subjectCell = row.querySelector("td:nth-child(3)"); // Assuming SUBJECT is the third column
        if (subjectCell) {
          const subjectText = subjectCell.textContent.toLowerCase();
          if (subjectText.includes(filter)) {
            row.style.display = "";
          } else {
            row.style.display = "none";
          }
        }
      });
    });
  }
}

async function openAddInputDialog() {
  const dialog = document.getElementById("addInputDialog");
  if (dialog) {
    // Reset form and set default values
    const form = document.getElementById("addInputForm");
    form.reset();

    // Set today's date as default for INPUT_DATE
    const today = new Date();
    document.getElementById("INPUT_DATE").value = today
      .toISOString()
      .slice(0, 10);

    // Set due date to 14 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    document.getElementById("DUE_DATE").value = dueDate
      .toISOString()
      .slice(0, 10);

    // Set requestor to current user
    document.getElementById("PEOPLE_ID").value = user || "";

    dialog.showModal();
  }
}

async function saveInput(event) {
  event.preventDefault();
  const form = document.getElementById("addInputForm");
  const formData = new FormData(form);

  try {
    // Get next ID from server
    const nextIdResponse = await fetch(`${url}/nextId`);
    const nextId = await nextIdResponse.json();

    // Prepare current timestamp
    const myRequestDate = new Date().toISOString().slice(0, 10);

    // Build data object
    const dataJson = {
      INPUT_ID: nextId,
      CREATE_DATE: myRequestDate,
      CREATE_BY: user || "TKENT",
      CLOSED: "N",
    };

    // Add form data with proper case handling
    for (let field of formData.keys()) {
      const value = formData.get(field);

      switch (field) {
        case "PEOPLE_ID":
        case "ASSIGNED_TO":
        case "SUBJECT":
        case "PROJECT_ID":
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
      // Send email notification after successful save
      setTimeout(async () => {
        await sendEmailNotification(dataJson, nextId, myRequestDate);
      }, 100);

      document.getElementById("addInputDialog").close();
      await loadInputData(); // Reload the data
    } else {
      const errorText = await response.text();
      alert(`Failed to save input: ${errorText}`);
    }
  } catch (error) {
    console.error("Error saving input:", error);
    alert("Failed to save input. Please try again.");
  }
}

async function sendEmailNotification(dataJson, nextId, myRequestDate) {
  try {
    // Try to send email
    let toEmail = users[dataJson.ASSIGNED_TO];
    if (toEmail === undefined) {
      toEmail = users["DEFAULT"];
    }

    const emailData = {
      INPUT_ID: nextId,
      CREATE_DATE: myRequestDate,
      CREATE_BY: user,
      SUBJECT: dataJson.SUBJECT.toUpperCase(),
      PEOPLE_ID: dataJson.PEOPLE_ID,
      ASSIGNED_TO_EMAIL: toEmail,
      INPUT_TEXT: dataJson.INPUT_TEXT,
      DUE_DATE: dataJson.DUE_DATE,
      ASSIGNED_TO: dataJson.ASSIGNED_TO,
    };

    await fetch(url + "/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    }).then(async (response) => {
      if (response.ok) {
        await fetch(url + "/inputs_notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ACTION: "I",
            INPUT_ID: dataJson.INPUT_ID,
            NOTIFY_DATE: myRequestDate,
            ASSIGNED_TO: dataJson.ASSIGNED_TO,
          }),
        });
        return response.text();
      }
      throw new Error("Failed to send email");
    });
  } catch (error) {
    console.error("Email notification failed:", error);
    // Don't show user error for email failures
  }
}

async function loadInputData() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    displayInputTable(data);
  } catch (error) {
    console.error("Error loading input data:", error);
    document.getElementById("inputTableContainer").innerHTML =
      '<p class="error">Failed to load input data. Please refresh the page.</p>';
  }
}

function displayInputTable(data) {
  const container = document.getElementById("inputTableContainer");
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No input records found.</p>";
    return;
  }

  // Create table container for scrolling
  const tableContainer = document.createElement("div");
  tableContainer.setAttribute("class", "table-container");
  tableContainer.style.maxHeight = "calc(75vh - 60px)";
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

  // Define preferred column order for inputs
  const preferredOrder = [
    "INPUT_ID",
    "INPUT_DATE",
    "SUBJECT",
    "ASSIGNED_TO",
    "PROJECT_ID",
    "INPUT_TEXT",
    "DUE_DATE",
    "CLOSED",
    "CLOSED_DATE",
  ];

  // Get all available fields, prioritizing preferred order
  const availableFields = Object.keys(data[0]);
  const orderedFields = [];

  // First add fields in preferred order if they exist
  preferredOrder.forEach((field) => {
    if (availableFields.includes(field)) {
      orderedFields.push(field);
    }
  });

  // Then add any remaining fields
  availableFields.forEach((field) => {
    if (!orderedFields.includes(field)) {
      orderedFields.push(field);
    }
  });

  orderedFields.forEach((field, index) => {
    const th = document.createElement("th");
    th.textContent = formatFieldName(field);
    th.style.cursor = "pointer";
    th.addEventListener("click", () => sortTable(index));
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement("tbody");
  tbody.id = "inputTableBody";

  data.forEach((item) => {
    const row = document.createElement("tr");

    // Apply row styling based on closed status (if enabled in config)
    if (config && config.ui && config.ui.enableRowColors) {
      if (item.CLOSED === "Y") {
        row.style.backgroundColor = "#d4edda"; // Green for closed
      } else {
        row.style.backgroundColor = "#f8d7da"; // Light red for open
      }
    }

    orderedFields.forEach((key) => {
      const td = document.createElement("td");
      let cellContent = "";

      if (item[key] !== null && item[key] !== undefined) {
        if (key.endsWith("DATE") && key.length > 4) {
          cellContent = item[key].slice(0, 10);
        } else if (key === "INPUT_ID") {
          cellContent = `<a href="input.html?id=${item[key]}">${item[key]}</a>`;
        } else if (key === "CLOSED") {
          cellContent = item[key] === "Y" ? "Yes" : "No";
        } else {
          cellContent = item[key] || "";
        }
      } else {
        cellContent = "";
      }

      td.innerHTML = cellContent;
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
  const tbody = document.getElementById("inputTableBody");
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

    // Handle numeric columns (INPUT_ID)
    if (!isNaN(parseFloat(aVal)) && !isNaN(parseFloat(bVal))) {
      const aNum = parseFloat(aVal) || 0;
      const bNum = parseFloat(bVal) || 0;
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
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
