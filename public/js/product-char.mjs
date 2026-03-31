/**
 * Product Characteristic Management Module
 * Handles form submission, validation, and list rendering for PRODUCT_CHAR
 */

const url = "/product-char";
let currentSearchProductId = null;

/**
 * Open the add product characteristic dialog
 */
export async function openProductCharDialog() {
  const dialog = document.getElementById("addProductCharDialog");
  const form = document.getElementById("addProductCharForm");
  const charNoInput = document.getElementById("CHAR_NO");
  const errorMsg = document.getElementById("formErrorMessage");

  // Clear form
  form.reset();
  errorMsg.classList.remove("show");
  errorMsg.textContent = "";

  // Fetch next CHAR_NO
  try {
    const response = await fetch(`${url}/nextId`);
    const nextCharNo = await response.json();
    charNoInput.value = nextCharNo;
  } catch (error) {
    errorMsg.textContent = `Error loading next ID: ${error.message}`;
    errorMsg.classList.add("show");
    console.error("Error fetching next ID:", error);
  }

  // Open dialog
  dialog.classList.add("open");

  // Focus on first field
  document.getElementById("PRODUCT_ID").focus();
}

/**
 * Close the add product characteristic dialog
 */
export function closeProductCharDialog() {
  const dialog = document.getElementById("addProductCharDialog");
  dialog.classList.remove("open");
  document.getElementById("addProductCharForm").reset();
}

/**
 * Save a new product characteristic
 */
export async function saveProductChar(event) {
  event.preventDefault();

  const form = document.getElementById("addProductCharForm");
  const errorMsg = document.getElementById("formErrorMessage");
  const formData = new FormData(form);

  // Validate required fields
  const productId = document.getElementById("PRODUCT_ID").value.trim();
  const revisionLevel = document.getElementById("REVISION_LEVEL").value.trim();
  const charNo = document.getElementById("CHAR_NO").value.trim();

  if (!productId) {
    errorMsg.textContent = "PRODUCT_ID is required";
    errorMsg.classList.add("show");
    return;
  }

  if (!revisionLevel) {
    errorMsg.textContent = "REVISION_LEVEL is required";
    errorMsg.classList.add("show");
    return;
  }

  if (!charNo) {
    errorMsg.textContent = "CHAR_NO is required";
    errorMsg.classList.add("show");
    return;
  }

  // Build data object
  const dataJson = {
    PRODUCT_ID: productId.toUpperCase(),
    CHAR_NO: charNo,
    REVISION_LEVEL: revisionLevel,
    CREATE_BY: getCurrentUser(),
  };

  // Add all form fields with proper handling
  for (let [key, value] of formData.entries()) {
    if (key === "PRODUCT_ID" || key === "CHAR_NO" || key === "REVISION_LEVEL") {
      continue; // Already added
    }

    // Handle specific field types
    if (key === "ISSUE_DATE") {
      dataJson[key] = value ? value : null;
    } else if (
      ["NOMINAL", "LOWER", "UPPER", "INSP_PLN_SAMP_SIZE"].includes(key)
    ) {
      dataJson[key] = value ? parseFloat(value) : null;
    } else {
      dataJson[key] = value ? value.trim() : null;
    }
  }

  // First, validate PRODUCT_ID exists
  try {
    const checkResponse = await fetch(`${url}/${productId}`);

    // Any response means PRODUCT_ID doesn't exist in PRODUCT table check
    // We need to do a separate check by posting
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataJson),
    });

    const result = await response.json();

    // Status 202 means warning - PRODUCT_ID not found, ask for confirmation
    if (response.status === 202 && result.requiresConfirmation) {
      const confirmed = confirm(
        `${result.warning}\n\nDo you want to save anyway?`,
      );

      if (!confirmed) {
        return;
      }

      // User confirmed - retry with confirmation flag
      dataJson.confirmWarning = true;
      const retryResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataJson),
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.json();
        errorMsg.textContent =
          error.error || "Failed to create product characteristic";
        errorMsg.classList.add("show");
        return;
      }
    } else if (!response.ok) {
      const error = await result;
      errorMsg.textContent =
        error.error || "Failed to create product characteristic";
      errorMsg.classList.add("show");
      return;
    }

    // Success
    showSuccessMessage("Product characteristic created successfully!");
    closeProductCharDialog();

    // Reload list
    if (currentSearchProductId) {
      searchProductCharacteristics();
    } else {
      clearSearch();
    }
  } catch (error) {
    errorMsg.textContent = `Error: ${error.message}`;
    errorMsg.classList.add("show");
    console.error("Form submission error:", error);
  }
}

/**
 * Load and display product characteristics for a specific product
 */
export async function loadProductCharacteristics(productId) {
  const listContainer = document.getElementById("characteristicsList");

  if (!productId) {
    listContainer.innerHTML =
      '<div class="no-data">Enter a Product ID to view characteristics</div>';
    return;
  }

  try {
    const response = await fetch(`${url}/${productId}`);
    const characteristics = await response.json();

    if (!characteristics || characteristics.length === 0) {
      listContainer.innerHTML = `<div class="no-data">No characteristics found for Product ID: ${productId}</div>`;
      return;
    }

    renderCharacteristicsTable(characteristics, productId);
  } catch (error) {
    listContainer.innerHTML = `<div class="no-data">Error loading characteristics: ${error.message}</div>`;
    console.error("Error loading characteristics:", error);
  }
}

/**
 * Render characteristics as an HTML table
 */
function renderCharacteristicsTable(characteristics, productId) {
  const listContainer = document.getElementById("characteristicsList");

  const tableHtml = `
    <table class="characteristics-table">
      <thead>
        <tr>
          <th>Char No</th>
          <th>Name</th>
          <th>Type</th>
          <th>Nominal</th>
          <th>Lower</th>
          <th>Upper</th>
          <th>Units</th>
          <th>Revision</th>
          <th>Status</th>
          <th>Drawing No</th>
        </tr>
      </thead>
      <tbody>
        ${characteristics
          .map(
            (char) => `
          <tr>
            <td><span class="char-no-badge">${char.CHAR_NO}</span></td>
            <td>${char.NAME || "--"}</td>
            <td>${char.TYPE || "--"}</td>
            <td>${formatNumber(char.NOMINAL)}</td>
            <td>${formatNumber(char.LOWER)}</td>
            <td>${formatNumber(char.UPPER)}</td>
            <td>${char.UNITS || "--"}</td>
            <td>${char.REVISION_LEVEL || "--"}</td>
            <td>
              ${
                char.STATUS === "A"
                  ? '<span class="status-badge status-active">Active</span>'
                  : char.STATUS === "I"
                    ? '<span class="status-badge status-inactive">Inactive</span>'
                    : "--"
              }
            </td>
            <td>${char.DRAWING_NO || "--"}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  listContainer.innerHTML = tableHtml;
}

/**
 * Search for product characteristics by PRODUCT_ID
 */
export function searchProductCharacteristics() {
  const searchInput = document
    .getElementById("productIdSearch")
    .value.trim()
    .toUpperCase();

  if (!searchInput) {
    document.getElementById("characteristicsList").innerHTML =
      '<div class="no-data">Enter a Product ID to search</div>';
    return;
  }

  currentSearchProductId = searchInput;
  loadProductCharacteristics(searchInput);
}

/**
 * Clear the search and reset the list
 */
export function clearSearch() {
  document.getElementById("productIdSearch").value = "";
  currentSearchProductId = null;
  document.getElementById("characteristicsList").innerHTML =
    '<div class="no-data">Enter a Product ID to view characteristics</div>';
}

/**
 * Format a number for display (handle decimals properly)
 */
function formatNumber(value) {
  if (value === null || value === undefined) {
    return "--";
  }
  return parseFloat(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

/**
 * Get current user from session or default
 */
function getCurrentUser() {
  // Try to get from a global user variable if available
  if (typeof window.currentUser !== "undefined") {
    return window.currentUser;
  }
  // Check localStorage
  const user = localStorage.getItem("currentUser");
  return user || "SYSTEM";
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
  const msgElement = document.getElementById("successMessage");
  msgElement.textContent = message;
  msgElement.classList.add("show");
  setTimeout(() => {
    msgElement.classList.remove("show");
  }, 5000);
}

/**
 * Initialize form submission
 */
function initializeForm() {
  const form = document.getElementById("addProductCharForm");
  form.addEventListener("submit", saveProductChar);
}

// Initialize on module load
initializeForm();
