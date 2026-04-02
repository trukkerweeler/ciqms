import { getApiUrl, loadHeaderFooter } from "./utils.mjs";

loadHeaderFooter();

const apiUrl = await getApiUrl();
const url = `${apiUrl}/ncm-type`;

let isEditMode = false;
let originalNcmType = null;
let allTypes = [];

// Show error message
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.classList.add("show");

  const successDiv = document.getElementById("successMessage");
  successDiv.classList.remove("show");
}

// Show success message
function showSuccess(message) {
  const successDiv = document.getElementById("successMessage");
  successDiv.textContent = message;
  successDiv.classList.add("show");

  const errorDiv = document.getElementById("errorMessage");
  errorDiv.classList.remove("show");
}

// Hide all messages
function hideMessages() {
  document.getElementById("errorMessage").classList.remove("show");
  document.getElementById("successMessage").classList.remove("show");
}

// Open modal for adding new type
window.openModal = function () {
  isEditMode = false;
  originalNcmType = null;
  document.getElementById("ncmTypeForm").reset();
  hideMessages();
  document.getElementById("formTitle").textContent = "Add New NCM Type";
  document.getElementById("ncm_type").disabled = false;
  document.getElementById("deleteButton").style.display = "none";
  document.getElementById("saveButton").textContent = "Save";
  document.getElementById("backdrop").classList.add("open");
  document.getElementById("modal").classList.add("open");
};

// Close modal
window.closeModal = function () {
  document.getElementById("backdrop").classList.remove("open");
  document.getElementById("modal").classList.remove("open");
  document.getElementById("ncmTypeForm").reset();
  hideMessages();
  if (isEditMode) {
    isEditMode = false;
    originalNcmType = null;
  }
};

// Load all NCM types
async function loadAllTypes() {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to load NCM types");
    allTypes = await response.json();
    renderTable();
  } catch (error) {
    console.error("Error loading NCM types:", error);
    renderTable();
  }
}

// Render NCM types table
function renderTable() {
  const container = document.getElementById("tableContainer");

  if (!allTypes || allTypes.length === 0) {
    container.innerHTML =
      '<div class="empty-message">No NCM types found. Create one to get started.</div>';
    return;
  }

  const html = `
    <table>
      <thead>
        <tr>
          <th>NCM Type</th>
          <th>Description</th>
          <th style="width: 120px">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${allTypes
          .map(
            (type) => `
          <tr>
            <td>${escapeHtml(type.NCM_TYPE)}</td>
            <td>${escapeHtml(type.DESCRIPTION || "")}</td>
            <td>
              <div class="table-actions">
                <button class="btn-sm btn-sm-edit" data-type="${escapeHtml(type.NCM_TYPE)}">Edit</button>
                <button class="btn-sm btn-sm-delete" data-type="${escapeHtml(type.NCM_TYPE)}">Delete</button>
              </div>
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  container.innerHTML = html;

  // Add event listeners to the edit/delete buttons
  container.querySelectorAll(".btn-sm-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const type = e.target.getAttribute("data-type");
      openEditModal(type);
    });
  });

  container.querySelectorAll(".btn-sm-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const type = e.target.getAttribute("data-type");
      deleteTypeHandler(type);
    });
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Open modal for editing
window.openEditModal = async function (ncmType) {
  try {
    const response = await fetch(`${url}/${encodeURIComponent(ncmType)}`);
    if (!response.ok) throw new Error("NCM type not found");

    const data = await response.json();

    isEditMode = true;
    originalNcmType = data.NCM_TYPE;

    document.getElementById("ncmTypeForm").reset();
    hideMessages();
    document.getElementById("formTitle").textContent =
      `Edit NCM Type: ${data.NCM_TYPE}`;
    document.getElementById("ncm_type").value = data.NCM_TYPE;
    document.getElementById("description").value = data.DESCRIPTION || "";
    document.getElementById("ncm_type").disabled = true;
    document.getElementById("deleteButton").style.display = "inline-block";
    document.getElementById("saveButton").textContent = "Update";

    document.getElementById("backdrop").classList.add("open");
    document.getElementById("modal").classList.add("open");
  } catch (error) {
    console.error("Error loading NCM type:", error);
    showError("Failed to load NCM type");
  }
};

// Save NCM type (create or update)
async function saveNcmType() {
  const ncmType = document
    .getElementById("ncm_type")
    .value.trim()
    .toUpperCase();
  const description = document.getElementById("description").value.trim();

  if (!ncmType) {
    showError("NCM Type is required");
    return;
  }

  if (ncmType.length > 16) {
    showError("NCM Type cannot exceed 16 characters");
    return;
  }

  const method = isEditMode ? "PUT" : "POST";
  const saveUrl = isEditMode
    ? `${url}/${encodeURIComponent(originalNcmType)}`
    : url;

  try {
    const response = await fetch(saveUrl, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ncm_type: ncmType,
        description: description,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save");
    }

    showSuccess(
      isEditMode
        ? "NCM Type updated successfully"
        : "NCM Type created successfully",
    );
    closeModal();
    await loadAllTypes();
  } catch (error) {
    console.error("Error saving NCM type:", error);
    showError(error.message);
  }
}

// Delete NCM type handler
window.deleteTypeHandler = async function (ncmType) {
  if (!confirm(`Are you sure you want to delete NCM Type "${ncmType}"?`)) {
    return;
  }

  try {
    const response = await fetch(`${url}/${encodeURIComponent(ncmType)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete");
    }

    showSuccess("NCM Type deleted successfully");
    await loadAllTypes();
  } catch (error) {
    console.error("Error deleting NCM type:", error);
    showError(error.message);
  }
};

// Delete NCM type from modal
window.deleteNcmType = async function () {
  if (!isEditMode || !originalNcmType) {
    showError("No NCM Type selected for deletion");
    return;
  }

  await deleteTypeHandler(originalNcmType);
};

// Initialize page
function initializePage() {
  document.getElementById("btnAdd").addEventListener("click", openModal);
  document.getElementById("ncmTypeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveNcmType();
  });
  document
    .getElementById("deleteButton")
    .addEventListener("click", deleteNcmType);

  // Auto-uppercase NCM type input
  document.getElementById("ncm_type").addEventListener("input", (e) => {
    if (!e.target.disabled) {
      e.target.value = e.target.value.toUpperCase();
    }
  });

  loadAllTypes();
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePage);
} else {
  initializePage();
}
