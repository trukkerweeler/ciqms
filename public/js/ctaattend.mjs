// Fetch and display training records
async function loadTrainingData() {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch training records");
    const data = await response.json();
    displayTrainingTable(data);
  } catch (error) {
    console.error("Error loading training data:", error);
    document.getElementById("trainingTableContainer").innerHTML =
      '<p class="error">Failed to load training data. Please refresh the page.</p>';
  }
}
import { loadHeaderFooter, getUserValue, myport } from "./utils.mjs";

// Initialize header/footer
loadHeaderFooter();

// Configuration
const port = myport() || 3003;
const url = `http://localhost:${port}/attendance`;
let sortOrder = "asc";

document.addEventListener("DOMContentLoaded", async function () {
  setupEventListeners();
  await loadTrainingData();
});

function setupEventListeners() {
  // Add Training button
  const addTrainingBtn = document.getElementById("addTrainingBtn");
  if (addTrainingBtn) {
    addTrainingBtn.addEventListener("click", openAddTrainingDialog);
  }

  // Close button for add training dialog
  const closeAddBtn = document.getElementById("closeAddBtn");
  if (closeAddBtn) {
    closeAddBtn.addEventListener("click", () => {
      document.getElementById("addTrainingDialog").close();
    });
  }

  // Save training form
  const saveTrainingBtn = document.getElementById("saveTrainingBtn");
  if (saveTrainingBtn) {
    saveTrainingBtn.addEventListener("click", saveTraining);
  }

  // Close dialog on outside click for add training dialog
  const addTrainingDialog = document.getElementById("addTrainingDialog");
  if (addTrainingDialog) {
    addTrainingDialog.addEventListener("click", (e) => {
      if (e.target === addTrainingDialog) {
        addTrainingDialog.close();
      }
    });
  }
}

function openAddTrainingDialog() {
  const dialog = document.getElementById("addTrainingDialog");
  if (dialog) {
    // Reset form and set today's date
    const form = document.getElementById("addTrainingForm");
    form.reset();

    // Set today's date as default
    const today = new Date();
    document.getElementById("DATE_TIME").value = today
      .toISOString()
      .slice(0, 10);

    dialog.showModal();
  }
}

async function saveTraining(event) {
  event.preventDefault();
  const form = document.getElementById("addTrainingForm");
  const formData = new FormData(form);

  try {
    // Get next ID from server
    const nextIdResponse = await fetch(`${url}/nextId`);
    const nextId = await nextIdResponse.json();

    // Prepare current timestamp
    const attendanceDate = new Date();
    const myRequestDate = attendanceDate
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    try {
      // Get attendees from PEOPLE_ID textarea, split by comma, trim, and filter out blanks
      const attendeesRaw = formData.get("PEOPLE_ID") || "";
      const attendees = attendeesRaw
        .split(",")
        .map((x) => x.trim().toUpperCase())
        .filter((x) => x);
      if (attendees.length === 0) {
        alert("Please enter at least one attendee.");
        return;
      }

      // Prepare current timestamp
      const attendanceDate = new Date();
      const myRequestDate = attendanceDate
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      // Loop through attendees and submit each record
      for (const personId of attendees) {
        // Get next ID from server for each attendee
        const nextIdResponse = await fetch(`${url}/nextId`);
        const nextId = await nextIdResponse.json();

        // Build data object
        const dataJson = {
          COURSE_ATND_ID: nextId,
          CREATED_DATE: myRequestDate,
          CREATE_BY: "TKENT",
        };

        for (let field of formData.keys()) {
          if (field === "PEOPLE_ID") {
            dataJson[field] = personId;
          } else if (field === "INSTRUCTOR") {
            dataJson[field] = formData.get(field).toUpperCase();
          } else if (field === "LINK") {
            const linkValue = formData.get(field);
            console.log("LINK field value before send:", linkValue);
            if (linkValue) {
              const filename = linkValue.split("\\").pop().split("/").pop();
              dataJson[field] = filename;
            } else {
              dataJson[field] = linkValue;
            }
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

        if (!response.ok) {
          const errorText = await response.text();
          alert(`Failed to save training record for ${personId}: ` + errorText);
        }
      }

      document.getElementById("addTrainingDialog").close();
      // await loadTrainingData(); // Reload the data (refresh commented out)
    } catch (err) {
      alert("Error saving training record: " + err);
    }
  } catch (error) {
    console.error("Error loading training data:", error);
    document.getElementById("trainingTableContainer").innerHTML =
      '<p class="error">Failed to load training data. Please refresh the page.</p>';
  }
}

function displayTrainingTable(data) {
  const container = document.getElementById("trainingTableContainer");
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No training records found.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "data-table";

  // Create header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const headers = [
    "ID",
    "Course ID",
    "Date",
    "Person",
    "Instructor",
    "Minutes",
    "Created By",
    "Created Date",
    "Link",
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
  tbody.id = "trainingTableBody";

  data.forEach((item) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item.COURSE_ATND_ID || ""}</td>
      <td>${item.COURSE_ID || ""}</td>
      <td>${item.DATE_TIME ? formatDate(item.DATE_TIME) : ""}</td>
      <td>${item.PEOPLE_ID || ""}</td>
      <td>${item.INSTRUCTOR || ""}</td>
      <td>${item.MINUTES || ""}</td>
      <td>${item.CREATE_BY || ""}</td>
      <td>${item.CREATED_DATE ? formatDate(item.CREATED_DATE) : ""}</td>
      <td>${
        item.CTA_ATTENDANCE_LINK
          ? `<a href="/training-files/${encodeURIComponent(
              item.CTA_ATTENDANCE_LINK
            )}" target="_blank">Open File</a>`
          : ""
      }</td>
    `;

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.innerHTML = "";
  container.appendChild(table);
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function sortTable(columnIndex) {
  const tbody = document.getElementById("trainingTableBody");
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr"));
  const headerCells = document.querySelectorAll("thead th");

  // Toggle sort order
  sortOrder = sortOrder === "asc" ? "desc" : "asc";

  rows.sort((a, b) => {
    const aVal = a.cells[columnIndex].textContent.trim();
    const bVal = b.cells[columnIndex].textContent.trim();

    // Handle numeric columns
    if (columnIndex === 0 || columnIndex === 5) {
      // ID and Minutes
      const aNum = parseFloat(aVal) || 0;
      const bNum = parseFloat(bVal) || 0;
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
    }

    // Handle date columns
    if (columnIndex === 2 || columnIndex === 7) {
      // Date and Created Date
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
