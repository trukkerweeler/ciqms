import { loadHeaderFooter, myport } from "./utils.mjs";
loadHeaderFooter();
const port = myport();
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

const url = `http://localhost:${port}/schedule`;

function getRecords() {
  const main = document.querySelector("main");

  fetch(url, { method: "GET" })
    .then((response) => response.json())
    .then((records) => {
      // console.log(records);

      // Count completed audits
      const totalAudits = records.length;
      const completedAudits = records.filter(
        (r) => r.COMPLETION_DATE && r.COMPLETION_DATE.trim() !== ""
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
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");
      const header = document.createElement("tr");
      const td = document.createElement("td");

      for (let key in records[0]) {
        if (!skippers.includes(key)) {
          const th = document.createElement("th");
          th.textContent = key;
          header.appendChild(th);
        }
      }
      thead.appendChild(header);

      for (let record of records) {
        const tr = document.createElement("tr");
        // Shade row if COMPLETION_DATE exists and is not null/empty
        if (record.COMPLETION_DATE && record.COMPLETION_DATE.trim() !== "") {
          tr.style.backgroundColor = "#e0e0e0";
          tr.style.color = "#888";
        }
        for (let key in record) {
          const td = document.createElement("td");
          if (!skippers.includes(key)) {
            if (key !== null) {
              if (
                key.substring(key.length - 4) === "DATE" &&
                key.length > 0 &&
                record[key] !== null
              ) {
                td.textContent = record[key].slice(0, 10);
              } else {
                if (key == "AUDIT_MANAGER_ID") {
                  td.innerHTML = `<a href="http://localhost:${port}/manager.html?id=${record[key]}">${record[key]}</a>`;
                } else {
                  td.textContent = record[key];
                }
              }
            } else {
              td.textContent = record[key];
            }
            tr.appendChild(td);
          }
        }
        tbody.appendChild(tr);
      }

      table.appendChild(thead);
      table.appendChild(tbody);
      tableContainer.appendChild(table);
      main.appendChild(tableContainer);
    });
}

getRecords();
