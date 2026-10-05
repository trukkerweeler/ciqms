import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

const apiUrl = await getApiUrl();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(message, isError = false) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function renderSummary(summary) {
  document.getElementById("summary").innerHTML = [
    ["Child Jobs", summary.childJobs],
    ["With Remaining Quantity", summary.withRemainingQuantity],
    ["Total Remaining Quantity", summary.totalRemainingQuantity],
  ]
    .map(
      ([label, value]) =>
        `<article class="summary-card"><h3>${label}</h3><p>${value}</p></article>`,
    )
    .join("");
}

function renderJobs(jobs) {
  const wrapper = document.getElementById("jobsTableWrap");
  if (!jobs.length) {
    wrapper.innerHTML =
      '<p class="empty">No child jobs with closed parents were found.</p>';
    return;
  }

  const rows = jobs
    .map(
      (job) => `
        <tr>
          <td>${escapeHtml(`${job.childJob}-${job.childSuffix}`)}</td>
          <td>${escapeHtml(job.childPart)}</td>
          <td>${escapeHtml(job.childCustomer)}</td>
          <td>${job.childQtyOrder}</td>
          <td>${job.childQtyCompleted}</td>
          <td>${job.childQtyRemaining}</td>
          <td>${escapeHtml(job.childDateOpened)}</td>
          <td>${escapeHtml(job.childDateDue)}</td>
          <td>${escapeHtml(job.childDateClosed)}</td>
          <td>${escapeHtml(`${job.parentJob}-${job.parentSuffix}`)}</td>
          <td>${escapeHtml(job.parentPart)}</td>
          <td>${escapeHtml(job.parentDateClosed)}</td>
        </tr>`,
    )
    .join("");

  wrapper.innerHTML = `
    <div class="table-container">
      <table class="data-table">
        <thead><tr>
          <th>Child Job</th><th>Part</th><th>Customer</th>
          <th>Qty Order</th><th>Qty Complete</th><th>Qty Remaining</th>
          <th>Child Opened</th><th>Child Due</th><th>Child Closed</th>
          <th>Parent Job</th><th>Parent Part</th><th>Parent Closed</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function runReport() {
  setStatus("Loading report...");
  try {
    const response = await fetch(`${apiUrl}/closed-parent-child-jobs`);
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    renderSummary(data.summary);
    renderJobs(data.jobs);
    setStatus("Report loaded.");
  } catch (error) {
    console.error("[closed-parent-child-jobs]", error);
    setStatus(`Failed to load report: ${error.message}`, true);
  }
}

runReport();
