import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

let apiUrl;
let currentYear = new Date().getFullYear();

// Populate year dropdown (last 5 years)
function populateYears() {
  const yearSelect = document.getElementById("yearFilter");
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < 5; i++) {
    const year = currentYear - i;
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    if (i === 0) option.selected = true;
    yearSelect.appendChild(option);
  }
}

// Load filter options
async function loadFilterOptions() {
  const year = document.getElementById("yearFilter").value;

  try {
    // Load subjects
    const subjectsResponse = await fetch(
      `${apiUrl}/ia-dashboard/subjects?year=${year}`,
    );
    if (subjectsResponse.ok) {
      const subjects = await subjectsResponse.json();
      const subjectSelect = document.getElementById("subjectFilter");
      subjectSelect.innerHTML = '<option value="">All Subjects</option>';
      subjects.forEach((subject) => {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
      });
    }

    // Load clauses
    const clausesResponse = await fetch(
      `${apiUrl}/ia-dashboard/clauses?year=${year}`,
    );
    if (clausesResponse.ok) {
      const clauses = await clausesResponse.json();
      const clauseSelect = document.getElementById("clauseFilter");
      clauseSelect.innerHTML = '<option value="">All Clauses</option>';
      clauses.forEach((clause) => {
        const option = document.createElement("option");
        option.value = clause;
        option.textContent = clause;
        clauseSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error loading filter options:", error);
  }
}

// Load counts
async function loadCounts() {
  const year = document.getElementById("yearFilter").value;

  try {
    const response = await fetch(`${apiUrl}/ia-dashboard/counts?year=${year}`);
    if (!response.ok) throw new Error("Failed to load counts");

    const data = await response.json();

    document.getElementById("totalCount").textContent = data.total || 0;
    document.getElementById("carCount").textContent = data.CAR || 0;
    document.getElementById("ofiCount").textContent = data.OFI || 0;
    document.getElementById("dcrCount").textContent = data.DCR || 0;
  } catch (error) {
    console.error("Error loading counts:", error);
  }
}

// Load findings by clause
async function loadByClause() {
  const year = document.getElementById("yearFilter").value;

  try {
    const response = await fetch(
      `${apiUrl}/ia-dashboard/by-clause?year=${year}`,
    );
    if (!response.ok) throw new Error("Failed to load by-clause data");

    const data = await response.json();
    const tbody = document
      .getElementById("byClauseTable")
      .getElementsByTagName("tbody")[0];

    if (data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align: center">No findings</td></tr>';
      return;
    }

    tbody.innerHTML = data
      .map(
        (row) => `
      <tr>
        <td>${row.clause || "-"}</td>
        <td>${row.total || 0}</td>
        <td>${row.car_count || 0}</td>
        <td>${row.ofi_count || 0}</td>
        <td>${row.dcr_count || 0}</td>
      </tr>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading by-clause data:", error);
  }
}

// Load repeat findings
async function loadRepeatFindings() {
  const year = document.getElementById("yearFilter").value;

  try {
    const response = await fetch(
      `${apiUrl}/ia-dashboard/repeat-findings?year=${year}`,
    );
    if (!response.ok) throw new Error("Failed to load repeat findings");

    const data = await response.json();
    const tbody = document
      .getElementById("repeatTable")
      .getElementsByTagName("tbody")[0];

    if (data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" style="text-align: center">No repeat findings</td></tr>';
      return;
    }

    tbody.innerHTML = data
      .map(
        (row) => `
      <tr>
        <td>${row.clause || "-"}</td>
        <td>${row.occurrences || 0}</td>
        <td>${row.finding_count || 0}</td>
      </tr>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading repeat findings:", error);
  }
}

// Load all findings with filters
async function loadRawFindings() {
  const year = document.getElementById("yearFilter").value;
  const subject = document.getElementById("subjectFilter").value;
  const clause = document.getElementById("clauseFilter").value;

  try {
    let url = `${apiUrl}/ia-dashboard/findings?year=${year}`;
    if (subject) url += `&subject=${encodeURIComponent(subject)}`;
    if (clause) url += `&clause=${encodeURIComponent(clause)}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to load findings");

    const data = await response.json();
    const tbody = document
      .getElementById("rawTable")
      .getElementsByTagName("tbody")[0];

    if (data.length === 0) {
      document.getElementById("noDataMessage").style.display = "block";
      document.getElementById("countsSection").style.display = "none";
      document.getElementById("byClauseSection").style.display = "none";
      document.getElementById("repeatSection").style.display = "none";
      document.getElementById("rawSection").style.display = "none";
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center">No findings</td></tr>';
      return;
    }

    document.getElementById("noDataMessage").style.display = "none";
    document.getElementById("countsSection").style.display = "block";
    document.getElementById("byClauseSection").style.display = "block";
    document.getElementById("repeatSection").style.display = "block";
    document.getElementById("rawSection").style.display = "block";

    tbody.innerHTML = data
      .map(
        (row) => `
      <tr>
        <td>${formatDate(row.SCHEDULED_DATE)}</td>
        <td>${row.SUBJECT || "-"}</td>
        <td>${row.REFERENCE || "-"}</td>
        <td>
          <span class="badge badge-${(row.finding_type || "").toLowerCase()}">
            ${row.finding_type || "-"}
          </span>
        </td>
        <td>${row.finding_code || "-"}</td>
        <td class="observation-cell" title="${row.OBSERVATION || ""}">${truncateText(row.OBSERVATION, 100) || "-"}</td>
      </tr>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading findings:", error);
  }
}

// Helper: Format date
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// Helper: Truncate text
function truncateText(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

// Reload all data
async function reloadAll() {
  await loadCounts();
  await loadByClause();
  await loadRepeatFindings();
  await loadRawFindings();
}

// Event listeners
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize on DOM ready
  await loadHeaderFooter();
  apiUrl = await getApiUrl();

  populateYears();
  await loadFilterOptions();
  await reloadAll();

  // Filter change handlers
  document.getElementById("yearFilter").addEventListener("change", async () => {
    await loadFilterOptions();
    await reloadAll();
  });

  document
    .getElementById("subjectFilter")
    .addEventListener("change", loadRawFindings);

  document
    .getElementById("clauseFilter")
    .addEventListener("change", loadRawFindings);
});
