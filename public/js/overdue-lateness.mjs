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
    ["Open Jobs", summary.openJobs],
    ["Overdue Jobs", summary.overdueJobs],
    ["Average Overdue Days", summary.averageOverdueDays],
    ["Oldest Overdue", `${summary.oldestDaysOverdue} days`],
  ]
    .map(([label, value]) => `<article class="summary-card"><h3>${label}</h3><p>${value}</p></article>`)
    .join("");
}

function renderJobs(jobs) {
  const wrapper = document.getElementById("jobsTableWrap");
  if (!jobs.length) {
    wrapper.innerHTML = '<p class="empty">No open jobs with remaining quantity were found.</p>';
    return;
  }

  const rows = jobs
    .map(
      (job) => `
        <tr>
          <td>${escapeHtml(`${job.job}-${job.suffix}`)}</td>
          <td>${escapeHtml(job.part)}</td>
          <td>${escapeHtml(job.customer)}</td>
          <td>${escapeHtml(job.salesOrder)}${job.salesOrderLine ? `-${escapeHtml(job.salesOrderLine)}` : ""}</td>
          <td>${escapeHtml(job.dueDate)}</td>
          <td>${job.qtyOrder}</td>
          <td>${job.qtyCompleted}</td>
          <td>${job.remainingQty}</td>
          <td class="${job.daysOverdue > 0 ? "overdue" : "not-overdue"}">${job.daysOverdue}</td>
          <td>${escapeHtml(job.status)}</td>
        </tr>`,
    )
    .join("");

  wrapper.innerHTML = `
    <div class="table-container">
      <table class="data-table">
        <thead><tr>
          <th>Job</th><th>Part</th><th>Customer</th><th>Sales Order</th>
          <th>Due Date</th><th>Qty Order</th><th>Qty Complete</th>
          <th>Qty Remaining</th><th>Days Overdue</th><th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function loadSnapshot() {
  setStatus("Loading report...");
  try {
    const response = await fetch(`${apiUrl}/overdue-lateness`);
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
    renderSummary(data.summary);
    renderJobs(data.jobs);
    setStatus(`Snapshot loaded for ${data.asOfDate}.`);
  } catch (error) {
    console.error("[overdue-lateness]", error);
    setStatus(`Failed to load report: ${error.message}`, true);
  }
}

loadSnapshot();
