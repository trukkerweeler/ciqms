/**
 * Product Detail Module
 * Shows details for a specific product with its characteristics
 */

import { loadHeaderFooter } from "./utils.mjs";
import { getCurrentUser } from "./auth-utils.mjs";

loadHeaderFooter();

const PRODUCT_API_URL = "/products";
const CHAR_API_URL = "/product-char";
let currentProductId = null;
let currentProduct = null;
let allCharacteristics = [];
let editingCharacteristic = null;

/**
 * Get product ID from URL query parameter
 */
function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("productId");
}

/**
 * Initialize - load product and characteristics
 */
export async function initialize() {
  const productId = getProductIdFromUrl();

  if (!productId) {
    document.getElementById("mainContent").innerHTML =
      '<div class="content"><div class="empty-message">No product selected. <a href="products.html">← Back to Products</a></div></div>';
    return;
  }

  currentProductId = productId;
  document.getElementById("pageTitle").textContent = `Product - ${productId}`;

  // Set up event listeners for edit product modal controls
  document
    .getElementById("editBtnCancel")
    .addEventListener("click", closeEditModal);
  document
    .getElementById("editBackdrop")
    .addEventListener("click", closeEditModal);
  document
    .getElementById("editBtnSave")
    .addEventListener("click", saveProductEdit);

  // Set up event listeners for add characteristic
  document
    .getElementById("btnAddChar")
    .addEventListener("click", openCharModal);
  document
    .getElementById("btnCancel")
    .addEventListener("click", closeCharModal);
  document.getElementById("backdrop").addEventListener("click", closeCharModal);
  document
    .getElementById("btnSave")
    .addEventListener("click", saveCharacteristic);

  // Set up event listeners for edit characteristic modal
  document
    .getElementById("editCharBtnCancel")
    .addEventListener("click", closeEditCharModal);
  document
    .getElementById("editCharBackdrop")
    .addEventListener("click", closeEditCharModal);
  document
    .getElementById("editCharBtnSave")
    .addEventListener("click", saveEditCharacteristic);

  // Load product and characteristics
  await loadProduct();
  await loadCharacteristics();
}

/**
 * Load product details
 */
async function loadProduct() {
  try {
    const response = await fetch(
      `${PRODUCT_API_URL}/${encodeURIComponent(currentProductId)}`,
    );

    if (!response.ok) {
      showError("Failed to load product");
      return;
    }

    currentProduct = await response.json();
    renderProductDetails();
  } catch (error) {
    showError(`Error loading product: ${error.message}`);
  }
}

/**
 * Render product details
 */
function renderProductDetails() {
  if (!currentProduct) return;

  const p = currentProduct;
  const statusBadge =
    p.STATUS === "C"
      ? '<span class="badge badge-ok">Current</span>'
      : p.STATUS === "O"
        ? '<span class="badge badge-no">Obsolete</span>'
        : p.STATUS === "D"
          ? '<span class="badge">Development</span>'
          : "-";

  const html = `
    <div class="product-info-header">
      <h3>Product Information</h3>
      <button class="btn-sm btn-primary" id="btnEdit">Edit</button>
    </div>
    <div class="detail-grid">
      <div class="detail-field">
        <span class="detail-label">Product ID</span>
        <span class="detail-value">${escapeHtml(p.PRODUCT_ID)}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Name</span>
        <span class="detail-value ${!p.NAME ? "empty" : ""}">${p.NAME ? escapeHtml(p.NAME) : "—"}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Type</span>
        <span class="detail-value ${!p.PRODUCT_TYPE ? "empty" : ""}">${p.PRODUCT_TYPE ? escapeHtml(p.PRODUCT_TYPE) : "—"}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Status</span>
        <span class="detail-value">${statusBadge}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Revision Level</span>
        <span class="detail-value ${!p.REVISION_LEVEL ? "empty" : ""}">${p.REVISION_LEVEL ? escapeHtml(p.REVISION_LEVEL) : "—"}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Drawing Number</span>
        <span class="detail-value ${!p.DRAWING_NUMBER ? "empty" : ""}">${p.DRAWING_NUMBER ? escapeHtml(p.DRAWING_NUMBER) : "—"}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Reference</span>
        <span class="detail-value ${!p.REFERENCE ? "empty" : ""}">${p.REFERENCE ? escapeHtml(p.REFERENCE) : "—"}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Created By</span>
        <span class="detail-value">${escapeHtml(p.CREATE_BY)}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Created Date</span>
        <span class="detail-value">${p.CREATE_DATE ? p.CREATE_DATE.split("T")[0] : "—"}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Modified Date</span>
        <span class="detail-value">${p.MODIFIED_DATE ? p.MODIFIED_DATE.split("T")[0] : "—"}</span>
      </div>
    </div>
  `;

  document.getElementById("detailsContainer").innerHTML = html;

  // Re-attach event listener for Edit button after rendering
  document.getElementById("btnEdit").addEventListener("click", openEditModal);
}

/**
 * Load characteristics for this product
 */
async function loadCharacteristics() {
  try {
    const response = await fetch(
      `${CHAR_API_URL}/${encodeURIComponent(currentProductId)}`,
    );

    if (!response.ok) {
      allCharacteristics = [];
      renderCharacteristics();
      return;
    }

    allCharacteristics = (await response.json()) || [];
    renderCharacteristics();
  } catch (error) {
    console.error("Error loading characteristics:", error);
    allCharacteristics = [];
    renderCharacteristics();
  }
}

/**
 * Render characteristics table
 */
function renderCharacteristics() {
  const container = document.getElementById("charContainer");

  if (!allCharacteristics || allCharacteristics.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        No characteristics found for this product.
      </div>
    `;
    return;
  }

  const html = `
    <table>
      <thead>
        <tr>
          <th>Char No</th>
          <th>Name</th>
          <th>Type</th>
          <th>Nominal</th>
          <th>Lower</th>
          <th>Upper</th>
          <th>Sig Digits</th>
          <th>Units</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${allCharacteristics
          .map(
            (c) => `
          <tr>
            <td><span class="badge badge-char" style="cursor: pointer;" data-char-no="${c.CHAR_NO}">${c.CHAR_NO}</span></td>
            <td>${c.NAME || "-"}</td>
            <td>${c.TYPE || "-"}</td>
            <td>${formatNumberWithPrecision(c.NOMINAL, c.SIGNIFICAT_DIGITS)}</td>
            <td>${formatNumberWithPrecision(c.LOWER, c.SIGNIFICAT_DIGITS)}</td>
            <td>${formatNumberWithPrecision(c.UPPER, c.SIGNIFICAT_DIGITS)}</td>
            <td>${c.SIGNIFICAT_DIGITS || "-"}</td>
            <td>${c.UNITS || "-"}</td>
            <td>${
              c.STATUS === "A"
                ? '<span class="badge badge-ok">Active</span>'
                : c.STATUS === "I"
                  ? '<span class="badge badge-no">Inactive</span>'
                  : "-"
            }</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  container.innerHTML = html;

  // Add click event listeners to all Char No badges
  document.querySelectorAll(".badge-char[data-char-no]").forEach((badge) => {
    badge.addEventListener("click", (e) => {
      const charNo = e.target.getAttribute("data-char-no");
      const char = allCharacteristics.find((c) => c.CHAR_NO === charNo);
      if (char) {
        openEditCharModal(char);
      }
    });
  });
}

/**
 * Helper: Format numbers
 */
function formatNumber(val) {
  if (!val) return "-";
  if (typeof val === "number") {
    return val.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  }
  return val;
}

/**
 * Helper: Format number with specific precision based on significant digits
 */
function formatNumberWithPrecision(val, sigDigs) {
  if (val === null || val === undefined || val === "") return "-";
  if (typeof val !== "number") return val;
  if (val === 0) return "0";

  // If significant digits is specified, format to that precision
  if (sigDigs && sigDigs > 0) {
    return val.toPrecision(sigDigs);
  }
  // Otherwise, use default formatting (6 decimals with trailing zeros removed)
  return val.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  }
  return val;
}

/**
 * Open edit product modal
 */
export async function openEditModal() {
  if (!currentProduct) return;

  const editModal = document.getElementById("editModal");
  const editBackdrop = document.getElementById("editBackdrop");
  const editForm = document.getElementById("editForm");
  const editErrorBox = document.getElementById("editErrorBox");

  editForm.reset();
  editErrorBox.classList.remove("show");
  editBackdrop.classList.add("open");
  editModal.classList.add("open");

  // Pre-fill with current product data
  document.getElementById("editPRODUCT_ID").value = currentProduct.PRODUCT_ID;
  document.getElementById("editSTATUS").value = currentProduct.STATUS || "C";
  document.getElementById("editNAME").value = currentProduct.NAME || "";
  document.getElementById("editPRODUCT_TYPE").value =
    currentProduct.PRODUCT_TYPE || "";
  document.getElementById("editREVISION_LEVEL").value =
    currentProduct.REVISION_LEVEL || "";
  document.getElementById("editDRAWING_NUMBER").value =
    currentProduct.DRAWING_NUMBER || "";
  document.getElementById("editREFERENCE").value =
    currentProduct.REFERENCE || "";

  document.getElementById("editNAME").focus();
}

/**
 * Close edit product modal
 */
export function closeEditModal() {
  const editModal = document.getElementById("editModal");
  const editBackdrop = document.getElementById("editBackdrop");
  const editErrorBox = document.getElementById("editErrorBox");

  editBackdrop.classList.remove("open");
  editModal.classList.remove("open");
  editErrorBox.classList.remove("show");
  document.getElementById("editForm").reset();
}

/**
 * Save product edits
 */
export async function saveProductEdit() {
  const productId = document.getElementById("editPRODUCT_ID").value;
  const status = (document.getElementById("editSTATUS").value || "").trim();
  const name = (document.getElementById("editNAME").value || "").trim();
  const productType = (
    document.getElementById("editPRODUCT_TYPE").value || ""
  ).trim();
  const revisionLevel = (
    document.getElementById("editREVISION_LEVEL").value || ""
  ).trim();
  const drawingNumber = (
    document.getElementById("editDRAWING_NUMBER").value || ""
  ).trim();
  const reference = (
    document.getElementById("editREFERENCE").value || ""
  ).trim();
  const editErrorBox = document.getElementById("editErrorBox");

  editErrorBox.classList.remove("show");
  editErrorBox.textContent = "";

  if (!status) {
    showEditError("Status is required");
    return;
  }

  const currentUser = await getCurrentUser();

  const data = {
    PRODUCT_ID: productId,
    STATUS: status,
    NAME: name || null,
    PRODUCT_TYPE: productType || null,
    REVISION_LEVEL: revisionLevel || null,
    DRAWING_NUMBER: drawingNumber || null,
    REFERENCE: reference || null,
    MODIFIED_BY: currentUser?.name || "SYSTEM",
  };

  try {
    const response = await fetch(
      `${PRODUCT_API_URL}/${encodeURIComponent(productId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      showEditError(error.error || "Failed to save product");
      return;
    }

    closeEditModal();
    await loadProduct();
  } catch (error) {
    showEditError(`Error: ${error.message}`);
  }
}

/**
 * Open add characteristic modal
 */
export async function openCharModal() {
  const modal = document.getElementById("modal");
  const backdrop = document.getElementById("backdrop");
  const form = document.getElementById("form");
  const errorBox = document.getElementById("errorBox");

  form.reset();
  errorBox.classList.remove("show");
  backdrop.classList.add("open");
  modal.classList.add("open");

  document.getElementById("PRODUCT_ID").value = currentProductId;
  document.getElementById("REVISION_LEVEL").focus();
}

/**
 * Open edit characteristic modal
 */
export async function openEditCharModal(characteristic) {
  editingCharacteristic = characteristic;

  const editCharModal = document.getElementById("editCharModal");
  const editCharBackdrop = document.getElementById("editCharBackdrop");
  const editCharForm = document.getElementById("editCharForm");
  const editCharErrorBox = document.getElementById("editCharErrorBox");

  editCharForm.reset();
  editCharErrorBox.classList.remove("show");
  editCharBackdrop.classList.add("open");
  editCharModal.classList.add("open");

  // Pre-fill with current characteristic data
  document.getElementById("editCharPRODUCT_ID").value =
    characteristic.PRODUCT_ID;
  document.getElementById("editCharCHAR_NO").value = characteristic.CHAR_NO;
  document.getElementById("editCharREVISION_LEVEL").value =
    characteristic.REVISION_LEVEL || "";
  document.getElementById("editCharSTATUS").value =
    characteristic.STATUS || "A";
  document.getElementById("editCharNOMINAL").value =
    characteristic.NOMINAL || "";
  document.getElementById("editCharLOWER").value = characteristic.LOWER || "";
  document.getElementById("editCharUPPER").value = characteristic.UPPER || "";
  document.getElementById("editCharNAME").value = characteristic.NAME || "";
  document.getElementById("editCharTYPE").value = characteristic.TYPE || "";
  document.getElementById("editCharUNITS").value = characteristic.UNITS || "";
  document.getElementById("editCharSIGNIFICAT_DIGITS").value =
    characteristic.SIGNIFICAT_DIGITS || "";

  document.getElementById("editCharREVISION_LEVEL").focus();
}

/**
 * Close edit characteristic modal
 */
export function closeEditCharModal() {
  const editCharModal = document.getElementById("editCharModal");
  const editCharBackdrop = document.getElementById("editCharBackdrop");
  const editCharErrorBox = document.getElementById("editCharErrorBox");

  editCharBackdrop.classList.remove("open");
  editCharModal.classList.remove("open");
  editCharErrorBox.classList.remove("show");
  document.getElementById("editCharForm").reset();
  editingCharacteristic = null;
}

/**
 * Save edited characteristic
 */
export async function saveEditCharacteristic() {
  if (!editingCharacteristic) return;

  const charNo = document.getElementById("editCharCHAR_NO").value;
  const productId = document.getElementById("editCharPRODUCT_ID").value;
  const revisionLevel = (
    document.getElementById("editCharREVISION_LEVEL").value || ""
  ).trim();
  const status = (document.getElementById("editCharSTATUS").value || "").trim();
  const nominal = document.getElementById("editCharNOMINAL").value
    ? parseFloat(document.getElementById("editCharNOMINAL").value)
    : null;
  const lower = document.getElementById("editCharLOWER").value
    ? parseFloat(document.getElementById("editCharLOWER").value)
    : null;
  const upper = document.getElementById("editCharUPPER").value
    ? parseFloat(document.getElementById("editCharUPPER").value)
    : null;
  const name = (document.getElementById("editCharNAME").value || "").trim();
  const type = (document.getElementById("editCharTYPE").value || "").trim();
  const units = (document.getElementById("editCharUNITS").value || "").trim();
  const sigDigs = document.getElementById("editCharSIGNIFICAT_DIGITS").value
    ? parseInt(document.getElementById("editCharSIGNIFICAT_DIGITS").value)
    : null;
  const editCharErrorBox = document.getElementById("editCharErrorBox");

  editCharErrorBox.classList.remove("show");
  editCharErrorBox.textContent = "";

  if (!revisionLevel) {
    showEditCharError("Revision Level is required");
    return;
  }

  const currentUser = await getCurrentUser();

  const data = {
    PRODUCT_ID: productId,
    CHAR_NO: charNo,
    REVISION_LEVEL: revisionLevel,
    STATUS: status || null,
    NOMINAL: nominal,
    LOWER: lower,
    UPPER: upper,
    NAME: name || null,
    TYPE: type || null,
    UNITS: units || null,
    SIGNIFICAT_DIGITS: sigDigs,
    MODIFIED_BY: currentUser?.name || "SYSTEM",
  };

  try {
    const response = await fetch(
      `${CHAR_API_URL}/${encodeURIComponent(productId)}/${encodeURIComponent(charNo)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      showEditCharError(error.error || "Failed to save characteristic");
      return;
    }

    closeEditCharModal();
    await loadCharacteristics();
  } catch (error) {
    showEditCharError(`Error: ${error.message}`);
  }
}

/**
 * Close add characteristic modal
 */
export function closeCharModal() {
  const modal = document.getElementById("modal");
  const backdrop = document.getElementById("backdrop");
  const errorBox = document.getElementById("errorBox");

  backdrop.classList.remove("open");
  modal.classList.remove("open");
  errorBox.classList.remove("show");
  document.getElementById("form").reset();
}

/**
 * Save characteristic
 */
export async function saveCharacteristic() {
  const productId = document.getElementById("PRODUCT_ID").value;
  const revisionLevel = (
    document.getElementById("REVISION_LEVEL").value || ""
  ).trim();
  const errorBox = document.getElementById("errorBox");

  errorBox.classList.remove("show");
  errorBox.textContent = "";

  if (!revisionLevel) {
    showErrorBox("Revision Level is required");
    return;
  }

  const currentUser = await getCurrentUser();

  const data = {
    PRODUCT_ID: productId,
    REVISION_LEVEL: revisionLevel,
    CREATE_BY: currentUser?.name || "SYSTEM",
  };

  // Add optional fields
  const fields = [
    "NAME",
    "TYPE",
    "DRAWING_NO",
    "INSP_PLAN_EQUIP_ID",
    "ISSUE_DATE",
    "STANDARD_TYPE",
    "VARIABLE_STANDARD",
    "UNITS",
    "PAGE",
    "ZONE",
    "STATUS",
    "CATEGORY",
    "CLASS",
    "INSP_PLAN_EQP_TYPE",
    "INSP_PLN_SAMP_PLAN",
    "INSP_PLAN_AQL",
    "INSP_PLAN_LEVEL",
    "INSP_PLAN_DEV_ID",
    "INSP_PLAN_DEV_TYPE",
    "INSP_PLAN_CHT_TYPE",
    "INSP_PLAN_MEAS_BY",
    "INSP_PLAN_FREQ",
    "INSP_PLAN_CHART_BY",
    "SIGNIFICAT_DIGITS",
    "SAMP_PLAN_ID",
  ];

  for (const field of fields) {
    const el = document.getElementById(field);
    if (el) {
      const value = el.value.trim();
      data[field] = value || null;
    }
  }

  // Handle numeric fields
  const numFields = ["NOMINAL", "LOWER", "UPPER", "INSP_PLN_SAMP_SIZE"];
  for (const field of numFields) {
    const el = document.getElementById(field);
    if (el) {
      const value = el.value.trim();
      data[field] = value ? parseFloat(value) : null;
    }
  }

  try {
    const response = await fetch(CHAR_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.status === 202 && result.requiresConfirmation) {
      const proceed = confirm(`${result.warning}\n\nProceed anyway?`);
      if (!proceed) return;

      data.confirmWarning = true;
      const retryResponse = await fetch(CHAR_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.json();
        showErrorBox(error.error || "Failed to save");
        return;
      }

      closeCharModal();
      await loadCharacteristics();
      return;
    } else if (!response.ok) {
      const error = await response.json();
      showErrorBox(error.error || "Failed to save");
      return;
    }

    closeCharModal();
    await loadCharacteristics();
  } catch (error) {
    showErrorBox(`Error: ${error.message}`);
  }
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
 * Show error in modal
 */
function showErrorBox(msg) {
  const errorBox = document.getElementById("errorBox");
  errorBox.textContent = msg;
  errorBox.classList.add("show");
}

/**
 * Show error in edit product modal
 */
function showEditError(msg) {
  const editErrorBox = document.getElementById("editErrorBox");
  editErrorBox.textContent = msg;
  editErrorBox.classList.add("show");
}

/**
 * Show error in edit characteristic modal
 */
function showEditCharError(msg) {
  const editCharErrorBox = document.getElementById("editCharErrorBox");
  editCharErrorBox.textContent = msg;
  editCharErrorBox.classList.add("show");
}

/**
 * Show error message
 */
function showError(msg) {
  console.error(msg);
  document.getElementById("mainContent").innerHTML = `
    <div class="content">
      <div class="details-section" style="color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb;">
        ${escapeHtml(msg)}
      </div>
    </div>
  `;
}
