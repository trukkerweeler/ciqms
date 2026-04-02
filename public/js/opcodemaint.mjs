import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

console.log("[opcodemaint] Module loading...");

let apiUrl;
let url;
let initPromise;

// Initialize async setup
initPromise = (async () => {
  console.log("[opcodemaint] Starting async initialization...");

  try {
    await loadHeaderFooter();
    console.log("[opcodemaint] Header/footer loaded");
  } catch (error) {
    console.error("[opcodemaint] Failed to load header/footer:", error);
  }

  try {
    apiUrl = await getApiUrl();
    url = `${apiUrl}/opcodes`;
    console.log("[opcodemaint] API URL:", url);
  } catch (error) {
    console.error("[opcodemaint] Failed to get API URL:", error);
    throw error;
  }
})();

let isEditMode = false;
let originalOpcode = null;
let allOpcodes = [];

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

// Open modal for adding new opcode
window.openModal = function () {
  isEditMode = false;
  originalOpcode = null;
  document.getElementById("opcodeForm").reset();
  hideMessages();
  document.getElementById("formTitle").textContent = "Add New OP Code";
  document.getElementById("opcode").disabled = false;
  document.getElementById("deleteButton").style.display = "none";
  document.getElementById("saveButton").textContent = "Save";
  document.getElementById("backdrop").classList.add("open");
  document.getElementById("modal").classList.add("open");
};

// Close modal
window.closeModal = function () {
  document.getElementById("backdrop").classList.remove("open");
  document.getElementById("modal").classList.remove("open");
  document.getElementById("opcodeForm").reset();
  hideMessages();
  if (isEditMode) {
    isEditMode = false;
    originalOpcode = null;
  }
};

// Load all opcodes
async function loadAllOpcodes() {
  if (!url) {
    console.error("[opcodemaint] URL not initialized");
    document.getElementById("tableContainer").innerHTML =
      '<div class="empty-message" style="color: #dc3545;">Error: API URL not initialized</div>';
    return;
  }

  console.log("[opcodemaint] Fetching from:", url);

  try {
    // Add 5 second timeout to fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn("[opcodemaint] Request timeout");
      controller.abort();
    }, 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[opcodemaint] Loaded", data.length, "opcodes");
    allOpcodes = data;
  } catch (error) {
    console.error("[opcodemaint] Error loading opcodes:", error);
    if (error.name === "AbortError") {
      const container = document.getElementById("tableContainer");
      container.innerHTML =
        '<div class="empty-message" style="color: #dc3545;">Error loading OP codes: Request timed out. Please check your connection and refresh the page.</div>';
      return;
    }
    allOpcodes = [];
  }

  renderTable();
}

// Render opcodes table
function renderTable() {
  const container = document.getElementById("tableContainer");

  if (!allOpcodes || allOpcodes.length === 0) {
    container.innerHTML =
      '<div class="empty-message">No OP codes found. Create one to get started.</div>';
    return;
  }

  const html = `
    <table>
      <thead>
        <tr>
          <th>OP Code</th>
          <th>Description</th>
          <th>Comments</th>
          <th style="width: 120px">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${allOpcodes
          .map(
            (opcode) => `
          <tr>
            <td>${escapeHtml(opcode.OPCODE)}</td>
            <td>${escapeHtml(opcode.DESCRIPTION || "")}</td>
            <td>${escapeHtml(opcode.COMMENTS || "")}</td>
            <td>
              <div class="table-actions">
                <button class="btn-sm btn-sm-edit" data-opcode="${escapeHtml(opcode.OPCODE)}">Edit</button>
                <button class="btn-sm btn-sm-delete" data-opcode="${escapeHtml(opcode.OPCODE)}">Delete</button>
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
      const opcode = e.target.getAttribute("data-opcode");
      openEditModal(opcode);
    });
  });

  container.querySelectorAll(".btn-sm-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const opcode = e.target.getAttribute("data-opcode");
      deleteOpcodeHandler(opcode);
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
window.openEditModal = async function (opcode) {
  try {
    const response = await fetch(`${url}/${encodeURIComponent(opcode)}`);
    if (!response.ok) throw new Error("OP code not found");

    const data = await response.json();

    isEditMode = true;
    originalOpcode = data.OPCODE;

    document.getElementById("opcodeForm").reset();
    hideMessages();
    document.getElementById("formTitle").textContent =
      `Edit OP Code: ${data.OPCODE}`;
    document.getElementById("opcode").value = data.OPCODE;
    document.getElementById("description").value = data.DESCRIPTION || "";
    document.getElementById("comments").value = data.COMMENTS || "";
    document.getElementById("opcode").disabled = true;
    document.getElementById("deleteButton").style.display = "inline-block";
    document.getElementById("saveButton").textContent = "Update";

    document.getElementById("backdrop").classList.add("open");
    document.getElementById("modal").classList.add("open");
  } catch (error) {
    console.error("Error loading opcode:", error);
    showError("Failed to load OP code");
  }
};

// Save opcode (create or update)
async function saveOpcode() {
  const opcode = document.getElementById("opcode").value.trim().toUpperCase();
  const description = document.getElementById("description").value.trim();
  const comments = document.getElementById("comments").value.trim();

  if (!opcode) {
    showError("OP Code is required");
    return;
  }

  if (opcode.length > 16) {
    showError("OP Code cannot exceed 16 characters");
    return;
  }

  const method = isEditMode ? "PUT" : "POST";
  const saveUrl = isEditMode
    ? `${url}/${encodeURIComponent(originalOpcode)}`
    : url;

  try {
    const response = await fetch(saveUrl, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opcode: opcode,
        description: description,
        comments: comments,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save");
    }

    showSuccess(
      isEditMode
        ? "OP Code updated successfully"
        : "OP Code created successfully",
    );
    closeModal();
    await loadAllOpcodes();
  } catch (error) {
    console.error("Error saving opcode:", error);
    showError(error.message);
  }
}

// Delete opcode handler
window.deleteOpcodeHandler = async function (opcode) {
  if (!confirm(`Are you sure you want to delete OP Code "${opcode}"?`)) {
    return;
  }

  try {
    const response = await fetch(`${url}/${encodeURIComponent(opcode)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete");
    }

    showSuccess("OP Code deleted successfully");
    await loadAllOpcodes();
  } catch (error) {
    console.error("Error deleting opcode:", error);
    showError(error.message);
  }
};

// Delete opcode from modal
window.deleteOpcode = async function () {
  if (!isEditMode || !originalOpcode) {
    showError("No OP Code selected for deletion");
    return;
  }

  await deleteOpcodeHandler(originalOpcode);
};

// Initialize page
window.addEventListener("DOMContentLoaded", async () => {
  console.log("[opcodemaint] DOMContentLoaded fired, waiting for init...");

  try {
    await initPromise;
  } catch (error) {
    console.error("[opcodemaint] Initialization failed:", error);
    document.getElementById("tableContainer").innerHTML =
      '<div class="empty-message" style="color: #dc3545;">Error: Failed to initialize. Check console for details.</div>';
    return;
  }

  console.log("[opcodemaint] Init complete, setting up event listeners...");

  document.getElementById("btnAdd").addEventListener("click", openModal);
  document.getElementById("opcodeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveOpcode();
  });
  document
    .getElementById("deleteButton")
    .addEventListener("click", deleteOpcode);

  // Auto-uppercase opcode input
  document.getElementById("opcode").addEventListener("input", (e) => {
    if (!e.target.disabled) {
      e.target.value = e.target.value.toUpperCase();
    }
  });

  console.log("[opcodemaint] Loading opcodes...");
  loadAllOpcodes();
});
