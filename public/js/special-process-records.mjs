import { specialProcessFormCatalog } from "./special-process-form-names.mjs";
import { getApiUrl } from "./utils.mjs";

const recordsBody = document.getElementById("recordsBody");
const refreshBtn = document.getElementById("refreshBtn");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatWorkOrder(row) {
  if (row.WORK_ORDER_RAW) return row.WORK_ORDER_RAW;
  const job = String(row.WORK_ORDER_JOB || "").trim();
  const suffix = String(row.WORK_ORDER_SUFFIX || "").trim();
  if (!job && !suffix) return "-";
  if (!suffix) return job;
  return `${job}-${suffix}`;
}

function formLinkForRow(row) {
  const form = specialProcessFormCatalog.find(
    (item) => item.definitionId === row.FORM_DEFINITION_ID,
  );
  if (!form || !row.FORM_INSTANCE_ID) return null;

  const params = new URLSearchParams({
    id: form.id,
    instance: row.FORM_INSTANCE_ID,
  });
  return `special-process-form.html?${params.toString()}`;
}

function processPill(processType) {
  const normalized = String(processType || "").toLowerCase();
  const cssClass = normalized === "passivation" ? "passivation" : "chem-film";
  const label = normalized === "passivation" ? "Passivation" : "Chem Film";
  return `<span class="pill ${cssClass}">${label}</span>`;
}

function renderRows(records) {
  if (!recordsBody) return;

  if (!Array.isArray(records) || records.length === 0) {
    recordsBody.innerHTML =
      '<tr><td colspan="9" class="empty">No records found.</td></tr>';
    return;
  }

  recordsBody.innerHTML = records
    .map((row) => {
      const openHref = formLinkForRow(row);
      const openMarkup = openHref
        ? `<a class="btn" href="${escapeHtml(openHref)}">Open</a>`
        : '<span class="muted">Unavailable</span>';

      return `
        <tr>
          <td>${escapeHtml(formatDateTime(row.UPDATED_AT))}</td>
          <td>${escapeHtml(formatWorkOrder(row))}</td>
          <td>${processPill(row.PROCESS_TYPE)}</td>
          <td>${escapeHtml(row.FORM_LABEL || row.FORM_DEFINITION_ID || "-")}</td>
          <td>${escapeHtml(row.PART_NUMBER || "-")}</td>
          <td>${escapeHtml(String(row.QTY_ACCEPTED ?? 0))}/${escapeHtml(String(row.QTY_REJECTED ?? 0))}</td>
          <td>${escapeHtml(row.STATUS || "-")}</td>
          <td>${escapeHtml(row.UPDATED_BY || row.CREATED_BY || "-")}</td>
          <td>${openMarkup}</td>
        </tr>
      `;
    })
    .join("");
}

async function loadRecords() {
  if (!recordsBody) return;

  recordsBody.innerHTML =
    '<tr><td colspan="9" class="empty">Loading records...</td></tr>';

  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}/special-process-data?limit=300`, {
      credentials: "include",
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Failed to load records");
    }

    renderRows(payload.records || []);
  } catch (error) {
    recordsBody.innerHTML = `<tr><td colspan="9" class="empty">${escapeHtml(error.message || "Failed to load records")}</td></tr>`;
  }
}

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    loadRecords();
  });
}

loadRecords();
