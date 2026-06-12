import { loadHeaderFooter, getApiUrl, getSessionUser } from "./utils.mjs";

let url = "";

const skippers = [
  "ASST_AUDITOR1",
  "ASST_AUDITOR2",
  "ASST_AUDITOR3",
  "AUDITEE2",
  "AUDITEE_FUNCTION",
  "ENTITY_ID",
  "MODIFIED_BY",
  "MODIFIED_DATE",
  "CREATE_BY",
  "CREATED_DATE",
];

// Field name aliases for shorter display
const fieldAliases = {
  AUDIT_MANAGER_ID: "ID",
  SCHEDULED_DATE: "Scheduled",
  COMPLETION_DATE: "Completed",
  LEAD_AUDITOR: "Lead Auditor",
  AUDIT_ID: "Audit ID",
};

/**
 * Get display name for a field (uses alias if available, otherwise the original name)
 */
function getFieldDisplayName(fieldName) {
  return fieldAliases[fieldName] || fieldName;
}

const COL_WIDTHS_KEY = "scheduleColWidths";

function saveColWidths(fields, cols) {
  const saved = {};
  fields.forEach((key, i) => {
    saved[key] = parseInt(cols[i].style.width, 10);
  });
  localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(saved));
}

function loadColWidths() {
  try {
    return JSON.parse(localStorage.getItem(COL_WIDTHS_KEY)) || {};
  } catch {
    return {};
  }
}

function makeColumnsResizable(table, fields) {
  let startX, startWidth;

  table.addEventListener("mousedown", (e) => {
    const handle = e.target.closest(".col-resize-handle");
    if (!handle) return;
    e.preventDefault();
    const th = handle.closest("th");
    const colIndex = Array.from(th.parentElement.children).indexOf(th);
    const cols = table.querySelectorAll("col");
    const col = cols[colIndex];
    startX = e.clientX;
    startWidth = th.offsetWidth;
    handle.classList.add("resizing");

    function onMouseMove(e) {
      const newWidth = Math.max(40, startWidth + (e.clientX - startX));
      col.style.width = newWidth + "px";
    }

    function onMouseUp() {
      handle.classList.remove("resizing");
      saveColWidths(fields, Array.from(cols));
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const apiUrl = await getApiUrl();
  const user = await getSessionUser();
  url = `${apiUrl}/schedule`;

  await loadHeaderFooter();

  function getRecords(year) {
    const main = document.querySelector("main");

    // Clear previous content
    main.innerHTML = "";

    // Specify which fields to display in the table
    const myFields = [
      "AUDIT_MANAGER_ID",
      "STANDARD",
      "SUBJECT",
      "SCHEDULED_DATE",
      "LEAD_AUDITOR",
      "AUDITEE1",
      "COMPLETION_DATE",
    ];

    fetch(`${url}?year=${year}`, { method: "GET" })
      .then((response) => response.json())
      .then((records) => {
        // Count completed audits
        const totalAudits = records.length;
        const completedAudits = records.filter(
          (r) => r.COMPLETION_DATE && r.COMPLETION_DATE.trim() !== "",
        ).length;
        const incompleteAudits = totalAudits - completedAudits;

        // Update summary
        const summarySpan = document.getElementById("scheduleSummary");
        if (summarySpan) {
          summarySpan.textContent = `Total: ${totalAudits} | Completed: ${completedAudits} | In Progress: ${incompleteAudits}`;
        }

        const tableContainer = document.createElement("div");
        tableContainer.classList.add("table-container");

        const table = document.createElement("table");
        table.classList.add("schedule-table");

        // Initial column widths (px) — AUDITEE1 narrow, SUBJECT wide
        const defaultWidths = {
          AUDIT_MANAGER_ID: 60,
          STANDARD: 90,
          SUBJECT: 260,
          SCHEDULED_DATE: 100,
          LEAD_AUDITOR: 110,
          AUDITEE1: 80,
          COMPLETION_DATE: 100,
        };

        // Merge with any saved widths from previous session
        const savedWidths = loadColWidths();
        const colWidths = Object.assign({}, defaultWidths, savedWidths);

        const colgroup = document.createElement("colgroup");
        for (let key of myFields) {
          const col = document.createElement("col");
          col.style.width = (colWidths[key] || 100) + "px";
          colgroup.appendChild(col);
        }
        table.appendChild(colgroup);

        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");
        const header = document.createElement("tr");

        for (let key of myFields) {
          const th = document.createElement("th");
          th.textContent = getFieldDisplayName(key);

          // Add resize handle
          const handle = document.createElement("div");
          handle.className = "col-resize-handle";
          th.appendChild(handle);

          header.appendChild(th);
        }

        thead.appendChild(header);
        makeColumnsResizable(table, myFields);

        for (let record of records) {
          const tr = document.createElement("tr");
          tr.dataset.auditManagerId = record.AUDIT_MANAGER_ID;

          // Shade row if COMPLETION_DATE exists and is not null/empty
          if (record.COMPLETION_DATE && record.COMPLETION_DATE.trim() !== "") {
            tr.style.backgroundColor = "#e0e0e0";
            tr.style.color = "#888";
          }

          for (let key of myFields) {
            const td = document.createElement("td");
            const val = record[key];

            if (val === null || val === undefined) {
              td.textContent = "";
            } else if (
              key.substring(key.length - 4) === "DATE" &&
              key.length > 0
            ) {
              td.textContent = val.slice(0, 10);
            } else if (key === "AUDIT_MANAGER_ID") {
              td.innerHTML = `<a href="${apiUrl}/manager.html?id=${val}">${val}</a>`;
            } else {
              td.textContent = val;
            }
            tr.appendChild(td);
          }

          tbody.appendChild(tr);
        }

        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        main.appendChild(tableContainer);
      })
      .catch((error) => console.error("Error loading records:", error));
  }

  // Determine default year: previous year if January, else current year
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0 = January
  const defaultYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const yearPicker = document.getElementById("yearPicker");
  if (yearPicker) {
    yearPicker.value = defaultYear;
    yearPicker.addEventListener("change", (e) => {
      getRecords(e.target.value);
    });
  }
  getRecords(yearPicker ? yearPicker.value : defaultYear);
});
