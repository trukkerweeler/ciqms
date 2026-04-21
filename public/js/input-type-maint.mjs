import { getApiUrl, loadHeaderFooter } from "./utils.mjs";

loadHeaderFooter();

const apiUrl = await getApiUrl();
const url = `${apiUrl}/inputtype`;

let isEditMode = false;
let originalInputType = null;
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
  originalInputType = null;
  document.getElementById("inputTypeForm").reset();
  hideMessages();
  document.getElementById("formTitle").textContent = "Add New Input Type";
  document.getElementById("input_type").disabled = false;
  document.getElementById("deleteButton").style.display = "none";
  document.getElementById("saveButton").textContent = "Save";
  document.getElementById("backdrop").classList.add("open");
  document.getElementById("modal").classList.add("open");
};

// Close modal
window.closeModal = function () {
  document.getElementById("backdrop").classList.remove("open");
  document.getElementById("modal").classList.remove("open");
  document.getElementById("inputTypeForm").reset();
  hideMessages();
  if (isEditMode) {
    isEditMode = false;
    originalInputType = null;
  }
};

// Load all Input types
async function loadAllTypes() {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to load Input types");
    allTypes = await response.json();
    renderTable();
  } catch (error) {
    console.error("Error loading Input types:", error);
    renderTable();
  }
}

// Render Input types table
function renderTable() {
  const container = document.getElementById("tableContainer");

  if (!allTypes || allTypes.length === 0) {
    container.innerHTML =
      '<div class="empty-message">No Input types found. Create one to get started.</div>';
    return;
  }

  const html = `
    <table>
      <thead>
        <tr>
          <th>Input Type</th>
          <th>Description</th>
          <th style="width: 120px">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${allTypes
          .map(
            (type) => `
          <tr>
            <td>${escapeHtml(type.INPUT_TYPE)}</td>
            <td>${escapeHtml(type.DESCRIPTION || "")}</td>
            <td>
              <div class="table-actions">
                <button class="btn-sm btn-sm-edit" data-type="${escapeHtml(type.INPUT_TYPE)}">Edit</button>
                <button class="btn-sm btn-sm-delete" data-type="${escapeHtml(type.INPUT_TYPE)}">Delete</button>
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
window.openEditModal = async function (inputType) {
  try {
    const response = await fetch(`${url}/${encodeURIComponent(inputType)}`);
    if (!response.ok) throw new Error("Input type not found");

    const data = await response.json();

    isEditMode = true;
    originalInputType = data.INPUT_TYPE;

    document.getElementById("inputTypeForm").reset();
    hideMessages();
    document.getElementById("formTitle").textContent =
      `Edit Input Type: ${data.INPUT_TYPE}`;
    document.getElementById("input_type").value = data.INPUT_TYPE;
    document.getElementById("description").value = data.DESCRIPTION || "";
    document.getElementById("input_type").disabled = true;
    document.getElementById("deleteButton").style.display = "inline-block";
    document.getElementById("saveButton").textContent = "Update";

    document.getElementById("backdrop").classList.add("open");
    document.getElementById("modal").classList.add("open");
  } catch (error) {
    console.error("Error loading Input type:", error);
    showError("Failed to load Input type");
  }
};

// Save Input type (create or update)
async function saveInputType() {
  const inputType = document
    .getElementById("input_type")
    .value.trim()
    .toUpperCase();
  const description = document.getElementById("description").value.trim();

  if (!inputType) {
    showError("Input Type is required");
    return;
  }

  if (inputType.length > 16) {
    showError("Input Type cannot exceed 16 characters");
    return;
  }

  const method = isEditMode ? "PUT" : "POST";
  const saveUrl = isEditMode
    ? `${url}/${encodeURIComponent(originalInputType)}`
    : url;

  try {
    const response = await fetch(saveUrl, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input_type: inputType,
        description: description,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save");
    }

    showSuccess(
      isEditMode
        ? "Input Type updated successfully"
        : "Input Type created successfully",
    );
    closeModal();
    await loadAllTypes();
  } catch (error) {
    console.error("Error saving Input type:", error);
    showError(error.message);
  }
}

// Delete Input type handler
window.deleteTypeHandler = async function (inputType) {
  if (!confirm(`Are you sure you want to delete Input Type "${inputType}"?`)) {
    return;
  }

  try {
    const response = await fetch(`${url}/${encodeURIComponent(inputType)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete");
    }

    showSuccess("Input Type deleted successfully");
    await loadAllTypes();
  } catch (error) {
    console.error("Error deleting Input type:", error);
    showError(error.message);
  }
};

// Delete Input type from modal
window.deleteInputType = async function () {
  if (!isEditMode || !originalInputType) {
    showError("No Input Type selected for deletion");
    return;
  }

  await deleteTypeHandler(originalInputType);
};

// Initialize page
function initializePage() {
  document.getElementById("btnAdd").addEventListener("click", openModal);
  document.getElementById("inputTypeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveInputType();
  });
  document
    .getElementById("deleteButton")
    .addEventListener("click", deleteInputType);

  // Auto-uppercase Input type input
  document.getElementById("input_type").addEventListener("input", (e) => {
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
