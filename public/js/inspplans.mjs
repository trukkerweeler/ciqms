/**
 * Inspection Plans Module - 2-Step Workflow
 * Step 1: Lookup PRODUCT_INSP_PLAN by Product+Operation+RevLevel
 * Step 2: Create/manage PRD_INSP_PLN_CHR (characteristic-specific plans)
 */

import { loadHeaderFooter, getApiUrl, getSessionUser } from "./utils.mjs";

loadHeaderFooter();

const API_URL = "/inspplans";
console.log(`[inspplans.mjs] Module loaded with API_URL: ${API_URL}`);

let currentUser = null;
let currentStep = 1;
let loadedCharacteristics = [];
let currentPlanId = null;
let allPlans = {}; // Store all plans for filtering

/**
 * Initialize and load inspection plans (PRD_INSP_PLN_CHR records)
 */
async function initializeInspectionPlans() {
  currentUser = await getSessionUser();
  const container = document.getElementById("inspplans-container");

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    // Check if response is an error object
    if (data.error || !Array.isArray(data)) {
      container.innerHTML = `<div class="empty-message">No inspection plans found. (API: ${data.error || "No data"})</div>`;
      return;
    }

    // Check if array is empty
    if (data.length === 0) {
      container.innerHTML =
        '<div class="empty-message">No inspection plans in database.</div>';
      return;
    }

    // Store raw data and render
    groupAndStorePlans(data);
    applyFilter();
  } catch (error) {
    container.innerHTML = `<div class="empty-message">Error loading inspection plans: ${error.message}</div>`;
  }
}

/**
 * Group and store plans for filtering
 */
function groupAndStorePlans(plans) {
  allPlans = {};
  plans.forEach((plan) => {
    const sysId = plan.PRD_INSP_PLN_SYSID;
    if (!allPlans[sysId]) {
      allPlans[sysId] = {
        ...plan,
        characteristics: [],
      };
    }
    if (plan.CHAR_NUMBER) {
      allPlans[sysId].characteristics.push({
        CHAR_NUMBER: plan.CHAR_NUMBER,
        CHAR_NAME: plan.CHAR_NAME,
        SAMPLE_SIZE: plan.SAMPLE_SIZE,
      });
    }
  });
}

/**
 * Apply filter and re-render
 */
window.applyFilter = function () {
  const filterInput = document.getElementById("filter-product-id");
  const filterValue = filterInput ? filterInput.value.trim().toUpperCase() : "";

  let filteredPlans = allPlans;
  if (filterValue) {
    filteredPlans = {};
    Object.entries(allPlans).forEach(([sysId, plan]) => {
      if (
        plan.PRODUCT_ID &&
        plan.PRODUCT_ID.toUpperCase().includes(filterValue)
      ) {
        filteredPlans[sysId] = plan;
      }
    });
  }

  renderInspectionPlans(filteredPlans);
};

/**
 * Clear filter
 */
window.clearFilter = function () {
  const filterInput = document.getElementById("filter-product-id");
  if (filterInput) {
    filterInput.value = "";
    applyFilter();
  }
};

/**
 * Render inspection plans grouped by plan ID with characteristic count
 */
function renderInspectionPlans(groupedPlans) {
  const container = document.getElementById("inspplans-container");

  const plansList = Object.values(groupedPlans);

  if (plansList.length === 0) {
    container.innerHTML =
      '<div class="empty-message">No inspection plans match the filter.</div>';
    return;
  }

  const html = `
    <table>
      <thead>
        <tr>
          <th>Plan ID</th>
          <th>Plan Name</th>
          <th>Product ID</th>
          <th>Operation No</th>
          <th>Product Rev</th>
          <th>Characteristics</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${plansList
          .map(
            (plan) => `
          <tr>
            <td><a href="inspplan-detail.html?id=${escapeHtml(plan.PRD_INSP_PLN_SYSID)}" class="plan-id-link"><span class="badge badge-id">${escapeHtml(plan.PRD_INSP_PLN_SYSID)}</span></a></td>
            <td>${escapeHtml(plan.PLAN_NAME) || "-"}</td>
            <td>${escapeHtml(plan.PRODUCT_ID) || "-"}</td>
            <td>${escapeHtml(plan.OPERATION_NO) || "-"}</td>
            <td>${escapeHtml(plan.PRODUCT_REV_LEVEL) || "-"}</td>
            <td>
              ${plan.characteristics.length}
            </td>
            <td>
              <button class="btn-delete" onclick="deletePlanFromList('${escapeHtml(plan.PRD_INSP_PLN_SYSID)}')">
                Delete
              </button>
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
 * Delete a plan from the list page
 */
export async function deletePlanFromList(sysId) {
  if (
    !confirm(
      `Delete this inspection plan? This will remove all characteristics.`,
    )
  ) {
    return;
  }

  try {
    // First, fetch all records to get the characteristics for this plan
    const response = await fetch(API_URL);
    const allRecords = await response.json();
    const planRecords = allRecords.filter(
      (r) => r.PRD_INSP_PLN_SYSID === sysId,
    );

    // Delete each characteristic
    const errors = [];
    for (const record of planRecords) {
      if (record.CHAR_NUMBER) {
        try {
          const deleteResponse = await fetch(
            `${API_URL}/${encodeURIComponent(sysId)}/${encodeURIComponent(record.CHAR_NUMBER)}`,
            { method: "DELETE" },
          );

          if (!deleteResponse.ok) {
            const error = await deleteResponse.json();
            errors.push(`${record.CHAR_NUMBER}: ${error.error}`);
          }
        } catch (error) {
          errors.push(`${record.CHAR_NUMBER}: ${error.message}`);
        }
      }
    }

    if (errors.length === 0) {
      alert("Plan deleted successfully");
      initializeInspectionPlans();
    } else {
      alert(`Plan deleted with errors:\n${errors.join("\n")}`);
      initializeInspectionPlans();
    }
  } catch (error) {
    alert(`Error deleting plan: ${error.message}`);
  }
}

/**
 * STEP 1: Lookup PRODUCT_INSP_PLAN
 */
async function lookupPlan() {
  const productId = document.getElementById("product-id").value.trim();
  const operationNo = document.getElementById("operation-no").value.trim();
  const productRevLevel = document
    .getElementById("product-rev-level")
    .value.trim();

  if (!productId || !operationNo || !productRevLevel) {
    alert("Please fill in all required fields in Step 1");
    return;
  }

  console.log(
    `[inspplans.mjs] Looking up plan: ${productId} / ${operationNo} / ${productRevLevel}`,
  );

  try {
    const url = `/inspplans/lookup/${encodeURIComponent(productId)}/${encodeURIComponent(operationNo)}/${encodeURIComponent(productRevLevel)}`;
    console.log(`[inspplans.mjs] Calling: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      alert(`Error looking up plan: ${error.error}`);
      return;
    }

    const data = await response.json();
    console.log(`[inspplans.mjs] Lookup result:`, data);

    if (data.exists && data.plan) {
      currentPlanId = data.plan.PRD_INSP_PLN_SYSID;
      document.getElementById("generated-plan-id").textContent = currentPlanId;
      console.log(`[inspplans.mjs] Plan exists: ${currentPlanId}`);
    } else {
      currentPlanId = null;
      document.getElementById("generated-plan-id").textContent =
        "Will be auto-generated";
      console.log("[inspplans.mjs] Plan does not exist - will create new");
    }

    // Now load characteristics for Step 2
    await loadCharacteristics();
  } catch (error) {
    console.error("[inspplans.mjs] Fetch error:", error);
    alert(`Error looking up plan: ${error.message}`);
  }
}

/**
 * Load characteristics for the selected product
 */
async function loadCharacteristics() {
  const productId = document.getElementById("product-id").value.trim();

  if (!productId) {
    alert("Please enter a Product ID");
    return;
  }

  try {
    const url = `/inspplans/chars/${encodeURIComponent(productId)}`;
    console.log(`[inspplans.mjs] Loading characteristics from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      alert(
        `Error loading characteristics: ${errorData.error || response.statusText}`,
      );
      loadedCharacteristics = [];
      return;
    }

    const data = await response.json();
    console.log(`[inspplans.mjs] Received ${data.length} characteristics`);

    if (!Array.isArray(data)) {
      alert(`No characteristics found for product ${productId}`);
      loadedCharacteristics = [];
      return;
    }

    if (data.length === 0) {
      alert(`No characteristics found for product ${productId}`);
      loadedCharacteristics = [];
      return;
    }

    loadedCharacteristics = data;
    renderCharacteristics(data);
    moveToStep2();
  } catch (error) {
    console.error(`[inspplans.mjs] Fetch error:`, error);
    alert(`Error loading characteristics: ${error.message}`);
  }
}

/**
 * Render characteristics as checkboxes
 */
function renderCharacteristics(chars) {
  const charList = document.getElementById("characteristics-list");

  const html = chars
    .map(
      (char) => `
    <div class="char-item">
      <input 
        type="checkbox" 
        id="char-${escapeHtml(char.CHAR_NO)}" 
        value="${escapeHtml(char.CHAR_NO)}"
        class="char-checkbox"
      />
      <label for="char-${escapeHtml(char.CHAR_NO)}">
        <strong>${escapeHtml(char.CHAR_NO)}</strong> - ${escapeHtml(char.NAME || char.CHAR_NAME || "")} 
        (${escapeHtml(char.INSPECTION_TYPE || char.INSP_TYPE || "Standard")})
      </label>
    </div>
  `,
    )
    .join("");

  charList.innerHTML = html;
}

/**
 * Move to step 2 (characteristics selection)
 */
function moveToStep2() {
  currentStep = 2;
  document.getElementById("step1-content").style.display = "none";
  document.getElementById("step2-content").style.display = "block";
  document.getElementById("step1-indicator").classList.remove("active");
  document.getElementById("step2-indicator").classList.add("active");
  document.getElementById("create-btn").style.display = "inline-block";
}

/**
 * Move back to step 1
 */
function moveToStep1() {
  currentStep = 1;
  document.getElementById("step1-content").style.display = "block";
  document.getElementById("step2-content").style.display = "none";
  document.getElementById("step1-indicator").classList.add("active");
  document.getElementById("step2-indicator").classList.remove("active");
  document.getElementById("create-btn").style.display = "none";
}

/**
 * Open add inspection plan modal
 */
function openModal() {
  const dialog = document.getElementById("inspplan-dialog");
  const form = document.getElementById("create-inspplan-form");
  currentStep = 1;
  form.reset();
  moveToStep1();
  currentPlanId = null;
  loadedCharacteristics = [];
  document.getElementById("generated-plan-id").textContent =
    "Will be auto-generated";
  dialog.showModal();
}

/**
 * Close add inspection plan modal
 */
function closeModal() {
  const dialog = document.getElementById("inspplan-dialog");
  dialog.close();
  document.getElementById("create-inspplan-form").reset();
  loadedCharacteristics = [];
  currentPlanId = null;
  moveToStep1();
}

/**
 * Save new inspection plan with selected characteristics
 */
async function saveInspectionPlans(e) {
  e.preventDefault();

  // Get selected characteristics
  const checkboxes = document.querySelectorAll(".char-checkbox:checked");
  if (checkboxes.length === 0) {
    alert("Please select at least one characteristic");
    return;
  }

  const selectedChars = Array.from(checkboxes).map((cb) => cb.value);

  const productId = document.getElementById("product-id").value.trim();
  const operationNo = document.getElementById("operation-no").value.trim();
  const productRevLevel = document
    .getElementById("product-rev-level")
    .value.trim();
  const planName = document.getElementById("plan-name").value.trim();

  if (!productId || !operationNo || !productRevLevel) {
    alert("Please fill in all required fields");
    return;
  }

  const data = {
    PRODUCT_ID: productId,
    OPERATION_NO: operationNo,
    PRODUCT_REV_LEVEL: productRevLevel,
    PLAN_NAME: planName || null,
    characteristics: selectedChars,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      alert(
        `Inspection plan created successfully!\nPlan ID: ${result.sysId}\nCharacteristics: ${result.created}`,
      );
      closeModal();
      initializeInspectionPlans();
    } else {
      alert(
        `Error creating inspection plan: ${result.message || result.error}`,
      );
    }
  } catch (error) {
    alert(`Error creating inspection plan: ${error.message}`);
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  const addBtn = document.getElementById("btnAddInspPlan");
  const cancelBtn = document.getElementById("cancel-inspplan");
  const form = document.getElementById("create-inspplan-form");
  const loadPlanBtn = document.getElementById("load-plan-btn");
  const dialog = document.getElementById("inspplan-dialog");
  const filterInput = document.getElementById("filter-product-id");

  // Ensure dialog is closed on load
  if (dialog && dialog.open) {
    dialog.close();
  }

  if (addBtn) addBtn.addEventListener("click", openModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
  if (form) form.addEventListener("submit", saveInspectionPlans);
  if (loadPlanBtn)
    loadPlanBtn.addEventListener("click", (e) => {
      e.preventDefault();
      lookupPlan();
    });

  // Add filter input listener
  if (filterInput) {
    filterInput.addEventListener("input", applyFilter);
  }

  // Close modal when clicking outside of it (on the backdrop)
  if (dialog) {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        closeModal();
      }
    });
  }
}

// Make functions globally accessible for onclick handlers
window.deletePlanFromList = deletePlanFromList;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initializeInspectionPlans();
  setupEventListeners();
});
