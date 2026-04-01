/**
 * Inspection Plan Detail Page
 * Shows full plan with all characteristics
 */

import { loadHeaderFooter, getSessionUser } from "./utils.mjs";

loadHeaderFooter();

const API_URL = "/inspplans";
let currentPlan = null;
let currentUser = null;

/**
 * Get plan ID from URL query params
 */
function getPlanIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

/**
 * Navigate back to list
 */
window.goBack = function () {
  window.location.href = "/inspplans.html";
};

/**
 * Load and display plan details
 */
async function loadPlanDetails() {
  currentUser = await getSessionUser();
  const planId = getPlanIdFromUrl();

  if (!planId) {
    document.getElementById("detail-container").innerHTML =
      '<div class="empty-message">No plan ID provided</div>';
    return;
  }

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!Array.isArray(data)) {
      document.getElementById("detail-container").innerHTML =
        '<div class="empty-message">Error loading plan data</div>';
      return;
    }

    // Find all records for this plan
    const planRecords = data.filter(
      (record) => record.PRD_INSP_PLN_SYSID === planId,
    );

    if (planRecords.length === 0) {
      document.getElementById("detail-container").innerHTML =
        '<div class="empty-message">Plan not found</div>';
      return;
    }

    // Get the header info from first record (all have same plan header data)
    const header = planRecords[0];
    currentPlan = {
      PRD_INSP_PLN_SYSID: header.PRD_INSP_PLN_SYSID,
      PRODUCT_ID: header.PRODUCT_ID,
      OPERATION_NO: header.OPERATION_NO,
      PRODUCT_REV_LEVEL: header.PRODUCT_REV_LEVEL,
      PLAN_NAME: header.PLAN_NAME,
      PLAN_REV_LEVEL: header.PLAN_REV_LEVEL,
      characteristics: planRecords
        .filter((r) => r.CHAR_NUMBER)
        .map((r) => ({
          CHAR_NUMBER: r.CHAR_NUMBER,
          CHAR_NAME: r.CHAR_NAME,
          SAMPLE_SIZE: r.SAMPLE_SIZE,
        })),
    };

    renderPlanDetails();
    renderCharacteristics();
  } catch (error) {
    console.error("Error loading plan:", error);
    document.getElementById("detail-container").innerHTML =
      `<div class="empty-message">Error loading plan: ${error.message}</div>`;
  }
}

/**
 * Render plan header information
 */
function renderPlanDetails() {
  const html = `
    <div class="info-row">
      <div class="info-label">Plan ID:</div>
      <div class="info-value"><strong>${escapeHtml(currentPlan.PRD_INSP_PLN_SYSID)}</strong></div>
    </div>
    <div class="info-row">
      <div class="info-label">Plan Name:</div>
      <div class="info-value">${escapeHtml(currentPlan.PLAN_NAME) || "-"}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Product ID:</div>
      <div class="info-value">${escapeHtml(currentPlan.PRODUCT_ID)}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Operation No:</div>
      <div class="info-value">${escapeHtml(currentPlan.OPERATION_NO)}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Product Rev Level:</div>
      <div class="info-value">${escapeHtml(currentPlan.PRODUCT_REV_LEVEL)}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Plan Rev Level:</div>
      <div class="info-value">${escapeHtml(currentPlan.PLAN_REV_LEVEL) || "-"}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Number of Characteristics:</div>
      <div class="info-value"><strong>${currentPlan.characteristics.length}</strong></div>
    </div>
  `;

  document.getElementById("plan-info").innerHTML = html;
}

/**
 * Render characteristics table
 */
function renderCharacteristics() {
  const tbody = document.getElementById("characteristics-body");

  if (currentPlan.characteristics.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="empty-message">No characteristics found</td></tr>';
    return;
  }

  const html = currentPlan.characteristics
    .map(
      (char) => `
      <tr>
        <td>${escapeHtml(char.CHAR_NUMBER)}</td>
        <td>${escapeHtml(char.CHAR_NAME) || "-"}</td>
        <td>${char.SAMPLE_SIZE || "-"}</td>
        <td>
          <button class="btn-small btn-remove" onclick="removeCharacteristic('${escapeHtml(char.CHAR_NUMBER)}')">
            Remove
          </button>
        </td>
      </tr>
    `,
    )
    .join("");

  tbody.innerHTML = html;
}

/**
 * Remove a characteristic from the plan
 */
window.removeCharacteristic = async function (charNumber) {
  if (!confirm(`Remove characteristic ${charNumber} from this plan?`)) {
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/${encodeURIComponent(currentPlan.PRD_INSP_PLN_SYSID)}/${encodeURIComponent(charNumber)}`,
      { method: "DELETE" },
    );

    if (response.ok) {
      alert("Characteristic removed successfully");
      loadPlanDetails();
    } else {
      const error = await response.json();
      alert(`Error removing characteristic: ${error.error}`);
    }
  } catch (error) {
    alert(`Error removing characteristic: ${error.message}`);
  }
};

/**
 * Delete entire plan
 */
window.deletePlan = async function () {
  if (
    !confirm(
      `Delete entire inspection plan ${currentPlan.PRD_INSP_PLN_SYSID}? This will remove all characteristics.`,
    )
  ) {
    return;
  }

  try {
    // Delete each characteristic
    const errors = [];
    for (const char of currentPlan.characteristics) {
      try {
        const response = await fetch(
          `${API_URL}/${encodeURIComponent(currentPlan.PRD_INSP_PLN_SYSID)}/${encodeURIComponent(char.CHAR_NUMBER)}`,
          { method: "DELETE" },
        );

        if (!response.ok) {
          const error = await response.json();
          errors.push(`${char.CHAR_NUMBER}: ${error.error}`);
        }
      } catch (error) {
        errors.push(`${char.CHAR_NUMBER}: ${error.message}`);
      }
    }

    if (errors.length === 0) {
      alert("Plan deleted successfully");
      window.location.href = "/inspplans.html";
    } else {
      alert(`Plan deleted with errors:\n${errors.join("\n")}`);
      window.location.href = "/inspplans.html";
    }
  } catch (error) {
    alert(`Error deleting plan: ${error.message}`);
  }
};

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Load when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  loadPlanDetails();
});
