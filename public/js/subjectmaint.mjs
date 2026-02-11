import {
  loadHeaderFooter,
  getSessionUser,
  myport,
  getApiUrl,
} from "./utils.mjs";

loadHeaderFooter();

const apiUrl = await getApiUrl();
const baseUrl = `${apiUrl}/subjectmaint`;
let user;
let editingSubject = null;

// Initialize handler function
async function initializeSubjectMaint() {
  console.log("[subjectmaint.mjs] Initializing");
  try {
    user = await getSessionUser();
    await loadSubjects();
    setupEventListeners();
  } catch (error) {
    console.error("Error during initialization:", error);
    showMessage("Error initializing page", "error");
  }
}

// Run initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSubjectMaint);
} else {
  initializeSubjectMaint();
}

// Setup all event listeners
function setupEventListeners() {
  // Add subject button
  document.getElementById("addSubjectBtn").addEventListener("click", () => {
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
    .getElementById("subjectForm")
    .addEventListener("submit", handleFormSubmit);

  // Delete confirmation
  document
    .getElementById("confirmDeleteBtn")
    .addEventListener("click", confirmDelete);

  // Close modals when clicking outside
  window.addEventListener("click", (event) => {
    const subjectModal = document.getElementById("subjectModal");
    const deleteModal = document.getElementById("deleteModal");
    if (event.target === subjectModal) {
      closeModal();
    }
    if (event.target === deleteModal) {
      closeDeleteModal();
    }
  });
}

// Load and display subjects
async function loadSubjects() {
  try {
    showLoading(true);
    const response = await fetch(baseUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const subjects = await response.json();
    displaySubjects(subjects);
    showLoading(false);
  } catch (error) {
    console.error("Error loading subjects:", error);
    showMessage("Error loading subjects: " + error.message, "error");
    showLoading(false);
  }
}

// Display subjects in table
function displaySubjects(subjects) {
  const tableBody = document.getElementById("subjectsTableBody");
  const table = document.getElementById("subjectsTable");

  // Clear existing rows
  tableBody.innerHTML = "";

  if (subjects.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="3" style="text-align: center;">No subjects found</td></tr>';
  } else {
    subjects.forEach((subject) => {
      const row = createSubjectRow(subject);
      tableBody.appendChild(row);
    });
  }

  table.style.display = "table";
}

// Create a table row for a subject
function createSubjectRow(subject) {
  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${subject.SUBJECT}</td>
    <td>${subject.DESCRIPTION}</td>
    <td>
      <div class="action-buttons">
        <button class="edit-btn" onclick="editSubject('${subject.SUBJECT}', '${subject.DESCRIPTION}')">Edit</button>
        <button class="delete-btn" onclick="deleteSubject('${subject.SUBJECT}', '${subject.DESCRIPTION}')">Delete</button>
      </div>
    </td>
  `;

  return row;
}

// Open modal for add or edit
function openModal(mode, subject = null) {
  const modal = document.getElementById("subjectModal");
  const modalTitle = document.getElementById("modalTitle");
  const subjectCodeInput = document.getElementById("subjectCode");
  const subjectDescInput = document.getElementById("subjectDescription");

  if (mode === "add") {
    modalTitle.textContent = "Add Subject";
    subjectCodeInput.value = "";
    subjectCodeInput.disabled = false;
    subjectDescInput.value = "";
    editingSubject = null;
  } else if (mode === "edit" && subject) {
    modalTitle.textContent = "Edit Subject";
    subjectCodeInput.value = subject.code;
    subjectCodeInput.disabled = true; // Don't allow editing the code
    subjectDescInput.value = subject.description;
    editingSubject = subject.code;
  }

  modal.style.display = "block";
  subjectDescInput.focus();
}

// Close subject modal
function closeModal() {
  const modal = document.getElementById("subjectModal");
  modal.style.display = "none";
  editingSubject = null;
  document.getElementById("subjectForm").reset();
}

// Close delete modal
function closeDeleteModal() {
  const modal = document.getElementById("deleteModal");
  modal.style.display = "none";
}

// Handle form submission
async function handleFormSubmit(event) {
  event.preventDefault();

  const subjectCode = document
    .getElementById("subjectCode")
    .value.trim()
    .toUpperCase();
  const description = document
    .getElementById("subjectDescription")
    .value.trim();

  if (!subjectCode || !description) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  try {
    let response;

    if (editingSubject) {
      // Update existing subject
      response = await fetch(`${baseUrl}/${editingSubject}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          DESCRIPTION: description,
        }),
      });
    } else {
      // Create new subject
      response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          SUBJECT: subjectCode,
          DESCRIPTION: description,
        }),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to save subject");
    }

    const result = await response.json();
    showMessage(result.message, "success");
    closeModal();
    await loadSubjects();
  } catch (error) {
    console.error("Error saving subject:", error);
    showMessage("Error saving subject: " + error.message, "error");
  }
}

// Edit subject function (called from table buttons)
window.editSubject = function (code, description) {
  openModal("edit", { code, description });
};

// Delete subject function (called from table buttons)
window.deleteSubject = function (code, description) {
  const modal = document.getElementById("deleteModal");
  const subjectName = document.getElementById("deleteSubjectName");

  subjectName.textContent = `${code} - ${description}`;
  modal.style.display = "block";

  // Store the subject code for deletion
  document.getElementById("confirmDeleteBtn").dataset.subjectCode = code;
};

// Confirm delete
async function confirmDelete() {
  const subjectCode =
    document.getElementById("confirmDeleteBtn").dataset.subjectCode;

  if (!subjectCode) return;

  try {
    const response = await fetch(`${baseUrl}/${subjectCode}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete subject");
    }

    const result = await response.json();
    showMessage(result.message, "success");
    closeDeleteModal();
    await loadSubjects();
  } catch (error) {
    console.error("Error deleting subject:", error);
    showMessage("Error deleting subject: " + error.message, "error");
  }
}

// Show loading state
function showLoading(show) {
  const loadingContainer = document.getElementById("loadingContainer");
  const table = document.getElementById("subjectsTable");

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
