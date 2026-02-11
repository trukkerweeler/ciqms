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
const url = `${apiUrl}/expiry`;
let sortOrder = "asc";
let user; // Will be set in initialization

// Initialize handler function
async function initializeExpirys() {
  console.log("[expirys.mjs] Initializing");
  user = await getSessionUser();
  setupEventListeners();
  await loadExpiryData();
}

// Run initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExpirys);
} else {
  initializeExpirys();
}

function setupEventListeners() {
  const addExpiryBtn = document.getElementById("addExpiryBtn");
  if (addExpiryBtn) {
    addExpiryBtn.addEventListener("click", openAddExpiryDialog);
  }

  const closeAddBtn = document.getElementById("closeAddBtn");
  if (closeAddBtn) {
    closeAddBtn.addEventListener("click", () => {
      document.getElementById("addExpiryDialog").close();
    });
  }

  const saveExpiryBtn = document.getElementById("saveExpiryBtn");
  if (saveExpiryBtn) {
    saveExpiryBtn.addEventListener("click", saveExpiry);
  }

  const closeEditBtn = document.getElementById("closeEditBtn");
  if (closeEditBtn) {
    closeEditBtn.addEventListener("click", () => {
      document.getElementById("dispositionDialog").close();
    });
  }

  const saveDispositionBtn = document.getElementById("saveDispositionBtn");
  if (saveDispositionBtn) {
    saveDispositionBtn.addEventListener("click", saveDisposition);
  }

  // Close dialog on outside click for add expiry dialog
  const addExpiryDialog = document.getElementById("addExpiryDialog");
  if (addExpiryDialog) {
    addExpiryDialog.addEventListener("click", (e) => {
      if (e.target === addExpiryDialog) {
        addExpiryDialog.close();
      }
    });
  }

  // Close dialog on outside click for disposition dialog
  const dispositionDialog = document.getElementById("dispositionDialog");
  if (dispositionDialog) {
    dispositionDialog.addEventListener("click", (e) => {
      if (e.target === dispositionDialog) {
        dispositionDialog.close();
      }
    });
  }
}

function openAddExpiryDialog() {
  const dialog = document.getElementById("addExpiryDialog");
  if (dialog) {
    document.getElementById("addExpiryForm").reset();
    dialog.showModal();
  }
}

async function saveExpiry(event) {
  event.preventDefault(); // Prevent form submission
  const form = document.getElementById("addExpiryForm");
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
    const data = {
      EXPIRATION_ID: nextId,
      PRODUCT_ID: formData.get("PRODUCT_ID").toUpperCase(),
      DESCRIPTION: formData.get("DESCRIPTION"),
      EXPIRY_DATE: formData.get("EXPIRY_DATE"),
      RECV_DATE: formData.get("RECV_DATE"),
      LOT: formData.get("LOT").toUpperCase(),
      PO: formData.get("PO").toUpperCase(),
      MFG_DATE: formData.get("MFG_DATE"),
      COMMENT: formData.get("COMMENT"),
      CREATE_BY: user || "TKENT",
      CREATE_DATE: myRequestDate,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      // Increment the ID in the system
      await fetch(`${url}/incrementId`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      document.getElementById("addExpiryDialog").close();
      await loadExpiryData(); // Uncommented page refresh
      console.log("Expiry saved successfully!");
    } else {
      const errorText = await response.text();
      alert(`Failed to save expiry: ${errorText}`);
    }
  } catch (error) {
    console.error("Error saving expiry:", error);
    alert("Failed to save expiry. Please try again.");
  }
}

async function loadExpiryData() {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    displayExpiryTable(data);
  } catch (error) {
    console.error("Error loading expiry data:", error);
    document.getElementById("expiryTableContainer").innerHTML =
      '<p class="error">Failed to load expiry data. Please refresh the page.</p>';
  }
}

function displayExpiryTable(data) {
  const container = document.getElementById("expiryTableContainer");
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No expiry records found.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "data-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const headers = [
    "ID",
    "Product ID",
    "Description",
    "Expiry Date",
    "Lot #",
    "PO #",
    "Received Date",
    "Mfg Date",
    "Disposition",
    "Comment",
    "Actions",
  ];

  headers.forEach((header, index) => {
    const th = document.createElement("th");
    th.textContent = header;

    if (header !== "Actions") {
      th.style.cursor = "pointer";
      th.addEventListener("click", () => sortTable(index));
    }

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  tbody.id = "expiryTableBody";

  data.forEach((item) => {
    const row = document.createElement("tr");

    if (item.DISPOSITION === "SCRAP") {
      row.classList.add("scrap-row");
    } else if (item.DISPOSITION === "USE") {
      row.classList.add("use-row");
    }

    row.innerHTML = `
      <td>${item.EXPIRATION_ID || ""}</td>
      <td>${item.PRODUCT_ID || ""}</td>
      <td>${item.DESCRIPTION || ""}</td>
      <td>${item.EXPIRY_DATE ? formatDate(item.EXPIRY_DATE) : ""}</td>
      <td>${item.LOT || ""}</td>
      <td>${item.PO || ""}</td>
      <td>${item.RECV_DATE ? formatDate(item.RECV_DATE) : ""}</td>
      <td>${item.MFG_DATE ? formatDate(item.MFG_DATE) : ""}</td>
      <td>${item.DISPOSITION || ""}</td>
      <td>${item.COMMENT || ""}</td>
      <td>
        <button type="button" class="btn-secondary" onclick="editDisposition('${
          item.EXPIRATION_ID
        }')">
          <span class="btn-icon">✏️</span> Edit
        </button>
      </td>
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
  const tbody = document.getElementById("expiryTableBody");
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr"));
  const headerCells = document.querySelectorAll("thead th");

  sortOrder = sortOrder === "asc" ? "desc" : "asc";

  rows.sort((a, b) => {
    const aVal = a.cells[columnIndex].textContent.trim();
    const bVal = b.cells[columnIndex].textContent.trim();

    if (columnIndex === 0) {
      const aNum = parseFloat(aVal) || 0;
      const bNum = parseFloat(bVal) || 0;
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
    }

    if (columnIndex === 3 || columnIndex === 6 || columnIndex === 7) {
      const aDate = new Date(aVal) || new Date(0);
      const bDate = new Date(bVal) || new Date(0);
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
    }

    return sortOrder === "asc"
      ? aVal.localeCompare(bVal)
      : bVal.localeCompare(aVal);
  });

  tbody.innerHTML = "";
  rows.forEach((row) => tbody.appendChild(row));

  updateSortIndicators(headerCells, columnIndex);
}

function updateSortIndicators(headerCells, activeColumnIndex) {
  headerCells.forEach((th, index) => {
    th.textContent = th.textContent.replace(/ [↑↓]$/, "");

    if (index === activeColumnIndex) {
      const indicator = sortOrder === "asc" ? " ↑" : " ↓";
      th.textContent += indicator;
    }
  });
}

window.editDisposition = async function (expirationId) {
  try {
    const response = await fetch(`${url}/${expirationId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    document.getElementById("editExpirationId").value = expirationId;
    document.getElementById("editDisposition").value = data.DISPOSITION || "";
    document.getElementById("editComment").value = data.COMMENT || "";

    document.getElementById("dispositionDialog").showModal();
  } catch (error) {
    console.error("Error loading expiry data for edit:", error);
    alert("Failed to load expiry data for editing.");
  }
};

async function saveDisposition() {
  const expirationId = document.getElementById("editExpirationId").value;
  const disposition = document.getElementById("editDisposition").value;
  const comment = document.getElementById("editComment").value;

  try {
    let old_comment = "";
    try {
      const currentResponse = await fetch(`${url}/${expirationId}`);
      if (currentResponse.ok) {
        const currentData = await currentResponse.json();
        old_comment = currentData.COMMENT || "";
      }
    } catch (err) {
      console.error("Failed to fetch current comment:", err);
    }

    let finalComment;
    if (old_comment.length === 0) {
      finalComment = comment;
    } else if (comment.length === 0) {
      finalComment = old_comment;
    } else {
      finalComment = `${comment}\n${old_comment}`;
    }

    const response = await fetch(`${url}/${expirationId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        DISPOSITION: disposition,
        COMMENT: finalComment,
      }),
    });

    if (response.ok) {
      document.getElementById("dispositionDialog").close();
      await loadExpiryData(); // Uncommented page refresh
      console.log("Disposition updated successfully!");
    } else {
      const errorText = await response.text();
      alert(`Failed to update disposition: ${errorText}`);
    }
  } catch (error) {
    console.error("Error saving disposition:", error);
    alert("Failed to update disposition. Please try again.");
  }
}
