/**
 * Products List Module
 * Displays all products from PRODUCT table
 */

import { loadHeaderFooter } from "./utils.mjs";
import { getCurrentUser } from "./auth-utils.mjs";

loadHeaderFooter();

const API_URL = "/products";

/**
 * Initialize and load products
 */
export async function initializeProducts() {
  const container = document.getElementById("listContainer");

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    // Check if response is an error object
    if (data.error || !Array.isArray(data)) {
      container.innerHTML = `<div class="empty-message">No products found. (API: ${data.error || "No data"})</div>`;
      return;
    }

    // Check if array is empty
    if (data.length === 0) {
      container.innerHTML =
        '<div class="empty-message">No products in database.</div>';
      return;
    }

    renderProducts(data);
  } catch (error) {
    container.innerHTML = `<div class="empty-message">Error loading products: ${error.message}</div>`;
  }
}

/**
 * Render products as table
 */
function renderProducts(products) {
  const container = document.getElementById("listContainer");

  const html = `
    <table>
      <thead>
        <tr>
          <th>Product ID</th>
          <th>Name</th>
          <th>Type</th>
          <th>Status</th>
          <th>Revision</th>
          <th>Drawing Number</th>
          <th>Reference</th>
          <th>Created By</th>
          <th>Created Date</th>
        </tr>
      </thead>
      <tbody>
        ${products
          .map(
            (p) => `
          <tr style="cursor: pointer;" onclick="window.location.href='product-detail.html?productId=${encodeURIComponent(p.PRODUCT_ID)}'">
            <td><span class="badge badge-id">${escapeHtml(p.PRODUCT_ID)}</span></td>
            <td>${escapeHtml(p.NAME) || "-"}</td>
            <td>${escapeHtml(p.PRODUCT_TYPE) || "-"}</td>
            <td>${
              p.STATUS === "C"
                ? '<span class="badge badge-ok">Current</span>'
                : p.STATUS === "O"
                  ? '<span class="badge badge-no">Obsolete</span>'
                  : p.STATUS === "D"
                    ? '<span class="badge">Development</span>'
                    : "-"
            }</td>
            <td>${escapeHtml(p.REVISION_LEVEL) || "-"}</td>
            <td>${escapeHtml(p.DRAWING_NUMBER) || "-"}</td>
            <td>${escapeHtml(p.REFERENCE) || "-"}</td>
            <td>${escapeHtml(p.CREATE_BY) || "-"}</td>
            <td>${p.CREATE_DATE ? p.CREATE_DATE.split("T")[0] : "-"}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Set up event listeners for modal and form
 */
export function setupEventListeners() {
  document.getElementById("btnAdd").addEventListener("click", openModal);
  document.getElementById("btnCancel").addEventListener("click", closeModal);
  document.getElementById("backdrop").addEventListener("click", closeModal);
  document.getElementById("btnSave").addEventListener("click", saveProduct);
}

/**
 * Open add product modal
 */
function openModal() {
  const modal = document.getElementById("modal");
  const backdrop = document.getElementById("backdrop");
  const form = document.getElementById("form");
  const errorMessage = document.getElementById("errorMessage");

  form.reset();
  errorMessage.classList.remove("show");
  backdrop.classList.add("open");
  modal.classList.add("open");

  document.getElementById("PRODUCT_ID").focus();
}

/**
 * Close add product modal
 */
function closeModal() {
  const modal = document.getElementById("modal");
  const backdrop = document.getElementById("backdrop");
  const form = document.getElementById("form");
  const errorMessage = document.getElementById("errorMessage");

  backdrop.classList.remove("open");
  modal.classList.remove("open");
  form.reset();
  errorMessage.classList.remove("show");
}

/**
 * Save new product
 */
async function saveProduct() {
  const productId = document.getElementById("PRODUCT_ID").value.trim();
  const name = document.getElementById("NAME").value.trim();
  const status = document.getElementById("STATUS").value.trim() || "C";
  const productType = document.getElementById("PRODUCT_TYPE").value.trim();
  const revisionLevel = document.getElementById("REVISION_LEVEL").value.trim();
  const drawingNumber = document.getElementById("DRAWING_NUMBER").value.trim();
  const reference = document.getElementById("REFERENCE").value.trim();
  const errorMessage = document.getElementById("errorMessage");

  // Clear error
  errorMessage.classList.remove("show");
  errorMessage.textContent = "";

  // Validate
  if (!productId) {
    showError("Product ID is required");
    return;
  }

  const currentUser = await getCurrentUser();
  const data = {
    PRODUCT_ID: productId,
    NAME: name || null,
    STATUS: status,
    PRODUCT_TYPE: productType || null,
    REVISION_LEVEL: revisionLevel || null,
    DRAWING_NUMBER: drawingNumber || null,
    REFERENCE: reference || null,
    CREATE_BY: currentUser?.name || "SYSTEM",
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      showError(error.error || "Failed to save product");
      return;
    }

    // Success - close modal and refresh list
    closeModal();
    await initializeProducts();
  } catch (error) {
    showError(`Error: ${error.message}`);
  }
}

/**
 * Show error message
 */
function showError(message) {
  const errorMessage = document.getElementById("errorMessage");
  errorMessage.textContent = message;
  errorMessage.classList.add("show");
}
