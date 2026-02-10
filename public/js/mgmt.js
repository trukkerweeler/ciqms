import { loadHeaderFooter, getConfig } from "/js/utils.mjs";

let config;

document.addEventListener("DOMContentLoaded", async () => {
  loadHeaderFooter();
  config = await getConfig();
  renderMgmtTable();
});

async function renderMgmtTable() {
  try {
    const response = await fetch("/mgmt");
    const data = await response.json();
    const tbody = document.querySelector("#mgmt-table tbody");
    tbody.innerHTML = "";
    data.forEach((row) => {
      const tr = document.createElement("tr");

      // Row coloring logic (like inputs)
      if (config && config.inputs && config.inputs.enableRowColors) {
        // Use CLOSED for mgmt (e.g., 'Y' or 'N')
        if (row.CLOSED && row.CLOSED.toUpperCase() === "Y") {
          const closedColor = config.inputs.colorScheme?.closed || "#e8f5e8";
          tr.style.backgroundColor = closedColor;
        } else if (row.DUE_DATE) {
          const dueDate = new Date(row.DUE_DATE);
          const today = new Date();
          const msPerDay = 24 * 60 * 60 * 1000;
          const daysUntilDue = Math.floor((dueDate - today) / msPerDay);

          if (daysUntilDue < 0) {
            const pastDueColor =
              config.inputs.colorScheme?.pastDue || "#ffebee";
            tr.style.backgroundColor = pastDueColor;
          } else if (daysUntilDue <= 7) {
            const dueSoonColor =
              config.inputs.colorScheme?.dueSoon || "#fff3e0";
            tr.style.backgroundColor = dueSoonColor;
          }
        }
      }

      tr.innerHTML = `
        <td>${row.INPUT_ID ?? ""}</td>
        <td>${row.INPUT_DATE ? row.INPUT_DATE.slice(0, 10) : ""}</td>
        <td>${row.SUBJECT ?? ""}</td>
        <td>${row.ASSIGNED_TO ?? ""}</td>
        <td>${row.CLOSED ? (row.CLOSED === "Y" ? "Closed" : "Open") : "Open"}</td>
        <td><!-- actions here --></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load management review data:", err);
  }
}
