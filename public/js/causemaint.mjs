import { loadHeaderFooter, getSessionUser, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

let baseUrl = "";
let user;
let editingCause = null;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const apiUrl = await getApiUrl();
    baseUrl = `${apiUrl}/causemaint`;
    user = await getSessionUser();
    await loadCauses();
    setupEventListeners();
  } catch (error) {
    console.error("Error during initialization:", error);
    showMessage("Error initializing page", "error");
  }
});

// Setup all event listeners
function setupEventListeners() {
  // Add cause button
  document.getElementById("addCauseBtn").addEventListener("click", () => {
    openModal("add");
  });

  // Modal close buttons
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("cancelBtn").addEventListener("click", closeModal);
  document
    .getElementById("closeDeleteModal")
    .addEventListener("click", closeDeleteModal);
  document
    .getElementById("cancelDeleteBtn")
    .addEventListener("click", closeDeleteModal);

  // Form submission
  document
    .getElementById("causeForm")
    .addEventListener("submit", handleFormSubmit);

  // Delete confirmation
  document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", confirmDelete);

  // Close modals when clicking outside
  window.addEventListener("click", (event) => {
    const causeModal = document.getElementById("causeModal");
    const deleteModal = document.getElementById("deleteModal");
    if (event.target === causeModal) {
      closeModal();
    }
    if (event.target === deleteModal) {
      closeDeleteModal();
    }
  });
}

// Load and display causes
async function loadCauses() {
  try {
    showLoading(true);
    const response = await fetch(baseUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const causes = await response.json();
    displayCauses(causes);
    showLoading(false);
  } catch (error) {
    console.error("Error loading causes:", error);
    showMessage("Error loading causes: " + error.message, "error");
    showLoading(false);
  }
}

// Display causes in table
function displayCauses(causes) {
  const tableBody = document.getElementById("causesTableBody");
  const table = document.getElementById("causesTable");

  // Clear existing rows
  tableBody.innerHTML = "";

  if (causes.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="3" style="text-align: center;">No causes found</td></tr>';
  } else {
    causes.forEach((cause) => {
      const row = createCauseRow(cause);
      tableBody.appendChild(row);
    });
  }

  table.style.display = "table";
}

// Create a table row for a cause
function createCauseRow(cause) {
  const row = document.createElement("tr");

  // Escape quotes for onclick functions
  const escapedCode = cause.CAUSE.replace(/'/g, "\\'");
  const escapedDesc = cause.DESCRIPTION.replace(/'/g, "\\'");

  row.innerHTML = `
    <td>${cause.CAUSE}</td>
    <td>${cause.DESCRIPTION}</td>
    <td>
      <div class="action-buttons">
        <button class="edit-btn" onclick="editCause('${escapedCode}', '${escapedDesc}')">Edit</button>
        <button class="delete-btn" onclick="deleteCause('${escapedCode}', '${escapedDesc}')">Delete</button>
      </div>
    </td>
  `;

  return row;
}

// Open modal for add or edit
function openModal(mode, cause = null) {
  const modal = document.getElementById("causeModal");
  const modalTitle = document.getElementById("modalTitle");
  const causeCodeInput = document.getElementById("causeCode");
  const causeDescInput = document.getElementById("causeDescription");

  if (mode === "add") {
    modalTitle.textContent = "Add Cause";
    causeCodeInput.value = "";
    causeCodeInput.disabled = false;
    causeDescInput.value = "";
    editingCause = null;
  } else if (mode === "edit" && cause) {
    modalTitle.textContent = "Edit Cause";
    causeCodeInput.value = cause.code;
    causeCodeInput.disabled = true; // Don't allow editing the code
    causeDescInput.value = cause.description;
    editingCause = cause.code;
  }

  modal.style.display = "block";
  causeDescInput.focus();
}

// Close cause modal
function closeModal() {
  const modal = document.getElementById("causeModal");
  modal.style.display = "none";
  editingCause = null;
  document.getElementById("causeForm").reset();
}

// Close delete modal
function closeDeleteModal() {
  const modal = document.getElementById("deleteModal");
  modal.style.display = "none";
}

// Handle form submission
async function handleFormSubmit(event) {
  event.preventDefault();

  const causeCode = document
    .getElementById("causeCode")
    .value.trim()
    .toUpperCase();
  const description = document.getElementById("causeDescription").value.trim();

  if (!causeCode || !description) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  try {
    let response;

    if (editingCause) {
      // Update existing cause
      response = await fetch(`${baseUrl}/${editingCause}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          DESCRIPTION: description,
        }),
      });
    } else {
      // Create new cause
      response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          CAUSE: causeCode,
          DESCRIPTION: description,
        }),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to save cause");
    }

    const result = await response.json();
    showMessage(result.message, "success");
    closeModal();
    await loadCauses();
  } catch (error) {
    console.error("Error saving cause:", error);
    showMessage("Error saving cause: " + error.message, "error");
  }
}

// Edit cause function (called from table buttons)
window.editCause = function (code, description) {
  openModal("edit", { code, description });
};

// Delete cause function (called from table buttons)
window.deleteCause = function (code, description) {
  const modal = document.getElementById("deleteModal");
  const causeName = document.getElementById("deleteCauseName");

  causeName.textContent = `${code} - ${description}`;
  modal.style.display = "block";

  // Store the cause code for deletion
  document.getElementById("confirmDeleteBtn").dataset.causeCode = code;
};

// Confirm delete
async function confirmDelete() {
  const causeCode =
    document.getElementById("confirmDeleteBtn").dataset.causeCode;

  if (!causeCode) return;

  try {
    const response = await fetch(`${baseUrl}/${causeCode}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete cause");
    }

    const result = await response.json();
    showMessage(result.message, "success");
    closeDeleteModal();
    await loadCauses();
  } catch (error) {
    console.error("Error deleting cause:", error);
    showMessage("Error deleting cause: " + error.message, "error");
  }
}

// Show loading state
function showLoading(show) {
  const loadingContainer = document.getElementById("loadingContainer");
  const table = document.getElementById("causesTable");

  if (show) {
    loadingContainer.style.display = "block";
    table.style.display = "none";
  } else {
    loadingContainer.style.display = "none";
  }
}

// Show messages to user
function showMessage(message, type) {
  const container = document.getElementById("messageContainer");
  container.innerHTML = `<div class="${type}">${message}</div>`;

  // Auto-hide success messages after 3 seconds
  if (type === "success") {
    setTimeout(() => {
      container.innerHTML = "";
    }, 3000);
  }
}
