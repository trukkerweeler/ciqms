import { getApiUrl, loadHeaderFooter } from "./utils.mjs";

loadHeaderFooter();

const apiUrl = await getApiUrl();
const url = `${apiUrl}/prd-char-type`;

let isEditMode = false;
let originalPrdCharType = null;
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
  originalPrdCharType = null;
  document.getElementById("prdCharTypeForm").reset();
  hideMessages();
  document.getElementById("formTitle").textContent = "Add New Type";
  document.getElementById("prd_char_type").disabled = false;
  document.getElementById("deleteButton").style.display = "none";
  document.getElementById("saveButton").textContent = "Save";
  document.getElementById("backdrop").classList.add("open");
  document.getElementById("modal").classList.add("open");
};

// Close modal
window.closeModal = function () {
  document.getElementById("backdrop").classList.remove("open");
  document.getElementById("modal").classList.remove("open");
  document.getElementById("prdCharTypeForm").reset();
  hideMessages();
  if (isEditMode) {
    isEditMode = false;
    originalPrdCharType = null;
  }
};

// Load all product characteristic types
async function loadAllTypes() {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to load types");
    allTypes = await response.json();
    renderTable();
  } catch (error) {
    console.error("Error loading types:", error);
    renderTable();
  }
}

// Render types table
function renderTable() {
  const container = document.getElementById("tableContainer");

  if (!allTypes || allTypes.length === 0) {
    container.innerHTML =
      '<div class="empty-message">No types found. Create one to get started.</div>';
    return;
  }

  const html = `
    <table>
      <thead>
        <tr>
          <th>Type Code</th>
          <th>Description</th>
          <th style="width: 120px">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${allTypes
          .map(
            (type) => `
          <tr>
            <td><strong>${type.PRD_CHAR_TYPE}</strong></td>
            <td>${type.DESCRIPTION || "-"}</td>
            <td>
              <div class="table-actions">
                <button class="btn-sm btn-sm-edit" onclick="editType('${type.PRD_CHAR_TYPE}')">Edit</button>
                <button class="btn-sm btn-sm-delete" onclick="deleteFromTable('${type.PRD_CHAR_TYPE}')">Delete</button>
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
}

// Edit type from table
window.editType = async function (prdCharType) {
  try {
    const response = await fetch(`${url}/${encodeURIComponent(prdCharType)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error("Type not found");
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to load type");
    }

    const data = await response.json();
    document.getElementById("prd_char_type").value = data.PRD_CHAR_TYPE || "";
    document.getElementById("description").value = data.DESCRIPTION || "";

    isEditMode = true;
    originalPrdCharType = data.PRD_CHAR_TYPE;

    document.getElementById("formTitle").textContent =
      `Edit: ${data.PRD_CHAR_TYPE}`;
    document.getElementById("prd_char_type").disabled = true;
    document.getElementById("deleteButton").style.display = "inline-block";
    document.getElementById("saveButton").textContent = "Update";
    hideMessages();

    // Open modal
    document.getElementById("backdrop").classList.add("open");
    document.getElementById("modal").classList.add("open");
  } catch (error) {
    console.error("Error loading type:", error);
    showError(`Failed to load type: ${error.message}`);
  }
};

// Delete from table
window.deleteFromTable = async function (prdCharType) {
  if (!confirm(`Delete "${prdCharType}"?`)) return;

  try {
    const response = await fetch(`${url}/${encodeURIComponent(prdCharType)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete");
    }

    // Remove from array and re-render
    allTypes = allTypes.filter((t) => t.PRD_CHAR_TYPE !== prdCharType);
    renderTable();
    showSuccess(`Deleted "${prdCharType}" successfully`);
  } catch (error) {
    console.error("Error deleting:", error);
    showError(`Failed to delete: ${error.message}`);
  }
};

// Load product characteristic type data for editing
async function loadPrdCharTypeData(prdCharType) {
  try {
    const response = await fetch(`${url}/${encodeURIComponent(prdCharType)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error("Type not found");
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to load type");
    }

    const data = await response.json();

    // Populate form
    document.getElementById("prd_char_type").value = data.PRD_CHAR_TYPE || "";
    document.getElementById("description").value = data.DESCRIPTION || "";

    // Switch to edit mode
    isEditMode = true;
    originalPrdCharType = data.PRD_CHAR_TYPE;

    // Update UI
    document.getElementById("formTitle").textContent =
      `Edit: ${data.PRD_CHAR_TYPE}`;
    document.getElementById("prd_char_type").disabled = true;
    document.getElementById("deleteButton").style.display = "inline-block";
    document.getElementById("saveButton").textContent = "Update";
    hideMessages();

    // Open modal
    document.getElementById("backdrop").classList.add("open");
    document.getElementById("modal").classList.add("open");
  } catch (error) {
    console.error("Error loading type:", error);
    showError(`Failed to load type: ${error.message}`);
  }
}

// Save product characteristic type (create or update)
async function savePrdCharType(formData) {
  const method = isEditMode ? "PUT" : "POST";
  const saveUrl = isEditMode
    ? `${url}/${encodeURIComponent(originalPrdCharType)}`
    : url;

  try {
    const response = await fetch(saveUrl, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to ${isEditMode ? "update" : "create"} type`,
      );
    }

    const result = await response.json();
    showSuccess(result.message);

    // Reload table to show new/updated data
    await loadAllTypes();

    // Close modal after successful save
    setTimeout(() => {
      closeModal();
    }, 1000);
  } catch (error) {
    console.error("Error saving type:", error);
    showError(`Failed to save: ${error.message}`);
  }
}

// Delete product characteristic type
async function deletePrdCharType() {
  if (!isEditMode || !originalPrdCharType) {
    showError("No type selected for deletion");
    return;
  }

  if (!confirm(`Delete "${originalPrdCharType}"?`)) return;

  try {
    const response = await fetch(
      `${url}/${encodeURIComponent(originalPrdCharType)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete");
    }

    showSuccess("Type deleted successfully");

    // Reload table
    await loadAllTypes();

    // Close modal after successful deletion
    setTimeout(() => {
      closeModal();
    }, 1000);
  } catch (error) {
    console.error("Error deleting type:", error);
    showError(`Failed to delete: ${error.message}`);
  }
}

// Clear form
function clearForm() {
  document.getElementById("prdCharTypeForm").reset();
  hideMessages();
  isEditMode = false;
  originalPrdCharType = null;
  document.getElementById("formTitle").textContent = "Add New Type";
  document.getElementById("prd_char_type").disabled = false;
  document.getElementById("deleteButton").style.display = "none";
  document.getElementById("saveButton").textContent = "Save";
}

// Validate form
function validateForm(formData) {
  if (!formData.prd_char_type || formData.prd_char_type.trim() === "") {
    showError("Type code is required");
    return false;
  }

  if (formData.prd_char_type.length > 16) {
    showError("Type code cannot exceed 16 characters");
    return false;
  }

  if (formData.description && formData.description.length > 40) {
    showError("Description cannot exceed 40 characters");
    return false;
  }

  return true;
}

// Initialize page
function initializePage() {
  // Load all types on page load
  loadAllTypes();

  // Add button handler
  document.getElementById("btnAdd").addEventListener("click", openModal);

  // Form submit handler
  document.getElementById("prdCharTypeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    hideMessages();

    const formData = {
      prd_char_type: document.getElementById("prd_char_type").value.trim(),
      description: document.getElementById("description").value.trim(),
    };

    if (validateForm(formData)) {
      savePrdCharType(formData);
    }
  });

  // Delete button handler
  document
    .getElementById("deleteButton")
    .addEventListener("click", deletePrdCharType);

  // Auto-uppercase input
  document.getElementById("prd_char_type").addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase();
  });

  // Close modal on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePage);
} else {
  initializePage();
}
