import { myport } from "./utils.mjs";

const port = myport() || 3003;
const url = `http://localhost:${port}/opcodes`;

let isEditMode = false;
let originalOpcode = null;

// Get URL parameters
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Show error message
function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";

  const successDiv = document.getElementById("successMessage");
  successDiv.style.display = "none";
}

// Show success message
function showSuccess(message) {
  const successDiv = document.getElementById("successMessage");
  successDiv.textContent = message;
  successDiv.style.display = "block";

  const errorDiv = document.getElementById("errorMessage");
  errorDiv.style.display = "none";
}

// Hide all messages
function hideMessages() {
  document.getElementById("errorMessage").style.display = "none";
  document.getElementById("successMessage").style.display = "none";
}

// Load opcode data for editing
async function loadOpcodeData(opcode) {
  try {
    const response = await fetch(`${url}/${encodeURIComponent(opcode)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("OP code not found");
      }
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to load OP code");
    }

    const data = await response.json();

    // Populate form
    document.getElementById("opcode").value = data.OPCODE || "";
    document.getElementById("description").value = data.DESCRIPTION || "";
    document.getElementById("comments").value = data.COMMENTS || "";

    // Switch to edit mode
    isEditMode = true;
    originalOpcode = data.OPCODE;

    // Update UI
    document.getElementById(
      "formTitle"
    ).textContent = `Edit OP Code: ${data.OPCODE}`;
    document.getElementById("opcode").disabled = true; // Don't allow changing the primary key
    document.getElementById("deleteButton").style.display = "inline-block";
    document.getElementById("saveButton").textContent = "Update";
  } catch (error) {
    console.error("Error loading opcode:", error);
    showError(`Failed to load OP code: ${error.message}`);
  }
}

// Save opcode (create or update)
async function saveOpcode(formData) {
  const method = isEditMode ? "PUT" : "POST";
  const saveUrl = isEditMode
    ? `${url}/${encodeURIComponent(originalOpcode)}`
    : url;

  try {
    const response = await fetch(saveUrl, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error ||
          `Failed to ${isEditMode ? "update" : "create"} OP code`
      );
    }

    const result = await response.json();
    showSuccess(result.message);

    if (!isEditMode) {
      // Clear form after successful creation
      clearForm();
    }
  } catch (error) {
    console.error("Error saving opcode:", error);
    showError(`Failed to save OP code: ${error.message}`);
  }
}

// Delete opcode
async function deleteOpcode() {
  if (!isEditMode || !originalOpcode) {
    showError("No OP code selected for deletion");
    return;
  }

  if (
    !confirm(`Are you sure you want to delete OP code "${originalOpcode}"?`)
  ) {
    return;
  }

  try {
    const response = await fetch(
      `${url}/${encodeURIComponent(originalOpcode)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete OP code");
    }

    const result = await response.json();
    showSuccess(result.message);

    // Redirect to list page after successful deletion
    setTimeout(() => {
      window.location.href = "opcodes.html";
    }, 2000);
  } catch (error) {
    console.error("Error deleting opcode:", error);
    showError(`Failed to delete OP code: ${error.message}`);
  }
}

// Clear form
function clearForm() {
  document.getElementById("opcodeForm").reset();
  hideMessages();

  if (isEditMode) {
    // If in edit mode, go back to add mode
    isEditMode = false;
    originalOpcode = null;

    document.getElementById("formTitle").textContent = "Add New OP Code";
    document.getElementById("opcode").disabled = false;
    document.getElementById("deleteButton").style.display = "none";
    document.getElementById("saveButton").textContent = "Save";

    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Validate form
function validateForm(formData) {
  if (!formData.opcode || formData.opcode.trim() === "") {
    showError("OP code is required");
    return false;
  }

  if (formData.opcode.length > 16) {
    showError("OP code cannot exceed 16 characters");
    return false;
  }

  return true;
}

// Initialize page
function initializePage() {
  // Check if we're editing an existing opcode
  const opcodeParam = getUrlParameter("opcode");
  if (opcodeParam) {
    loadOpcodeData(opcodeParam);
  }

  // Form submit handler
  document.getElementById("opcodeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    hideMessages();

    const formData = {
      opcode: document.getElementById("opcode").value.trim(),
      description: document.getElementById("description").value.trim(),
      comments: document.getElementById("comments").value.trim(),
    };

    if (validateForm(formData)) {
      saveOpcode(formData);
    }
  });

  // Clear button handler
  document.getElementById("clearButton").addEventListener("click", clearForm);

  // Delete button handler
  document
    .getElementById("deleteButton")
    .addEventListener("click", deleteOpcode);

  // Auto-uppercase opcode input
  document.getElementById("opcode").addEventListener("input", (e) => {
    e.target.value = e.target.value.toUpperCase();
  });
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initializePage);
