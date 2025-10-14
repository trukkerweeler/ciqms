// Opcodes Display Module
import { renderWithTemplate } from "./utils.mjs";

let opcodesData = [];
let filteredOpcodes = [];

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  await loadOpcodes();
  renderOpcodesTable();
  setupEventListeners();
});

// Load opcodes from the API
async function loadOpcodes() {
  try {
    const response = await fetch("/opcodes");
    if (!response.ok) {
      throw new Error("HTTP error! status: " + response.status);
    }
    opcodesData = await response.json();
    filteredOpcodes = [...opcodesData];
  } catch (error) {
    console.error("Error loading opcodes:", error);
    showError("Failed to load opcodes");
  }
}

// Render the opcodes table
function renderOpcodesTable() {
  const table = document.getElementById("opcodes");

  if (filteredOpcodes.length === 0) {
    table.innerHTML =
      '<tr><td colspan="3" class="no-data">No opcodes found</td></tr>';
    return;
  }

  // Create table header
  const headerRow =
    "<thead><tr><th>OP Code</th><th>Description</th><th>Comments</th></tr></thead>";

  // Create table body
  const bodyRows = filteredOpcodes
    .map((opcode) => {
      return (
        "<tr><td>" +
        escapeHtml(opcode.OPCODE || "") +
        "</td><td>" +
        escapeHtml(opcode.DESCRIPTION || "") +
        "</td><td>" +
        escapeHtml(opcode.COMMENTS || "") +
        "</td></tr>"
      );
    })
    .join("");

  table.innerHTML = headerRow + "<tbody>" + bodyRows + "</tbody>";
}

// Setup event listeners
function setupEventListeners() {
  const searchInput = document.getElementById("searchInput");
  const clearButton = document.getElementById("clearButton");

  // Search functionality
  searchInput.addEventListener("input", handleSearch);
  clearButton.addEventListener("click", clearSearch);

  // Enter key to search
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  });
}

// Handle search functionality
function handleSearch() {
  const searchTerm = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();

  if (searchTerm === "") {
    filteredOpcodes = [...opcodesData];
  } else {
    filteredOpcodes = opcodesData.filter((opcode) => {
      return (
        (opcode.OPCODE || "").toLowerCase().includes(searchTerm) ||
        (opcode.DESCRIPTION || "").toLowerCase().includes(searchTerm) ||
        (opcode.COMMENTS || "").toLowerCase().includes(searchTerm)
      );
    });
  }

  renderOpcodesTable();
}

// Clear search
function clearSearch() {
  document.getElementById("searchInput").value = "";
  filteredOpcodes = [...opcodesData];
  renderOpcodesTable();
}

// Show error message
function showError(message) {
  const table = document.getElementById("opcodes");
  table.innerHTML =
    '<tr><td colspan="3" class="error">' + escapeHtml(message) + "</td></tr>";
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Export functions for potential use by other modules
export { loadOpcodes, renderOpcodesTable, handleSearch, clearSearch };
