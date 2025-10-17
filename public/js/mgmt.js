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
        // Use STATUS for mgmt (e.g., 'Closed', 'Open', 'Past Due')
        if (row.STATUS && row.STATUS.toUpperCase() === "CLOSED") {
          const closedColor = config.inputs.colorScheme?.closed || "#e8f5e8";
          tr.style.backgroundColor = closedColor;
        } else if (
          row.STATUS &&
          row.STATUS.toUpperCase().includes("PAST DUE")
        ) {
          const pastDueColor = config.inputs.colorScheme?.pastDue || "#ffebee";
          tr.style.backgroundColor = pastDueColor;
        } else if (
          row.STATUS &&
          row.STATUS.toUpperCase().includes("DUE SOON")
        ) {
          const dueSoonColor = config.inputs.colorScheme?.dueSoon || "#fff3e0";
          tr.style.backgroundColor = dueSoonColor;
        }
      }

      tr.innerHTML = `
        <td>${row.ID ?? ""}</td>
        <td>${row.DATE ? row.DATE.slice(0, 10) : ""}</td>
        <td>${row.TOPIC ?? ""}</td>
        <td>${row.OWNER ?? ""}</td>
        <td>${row.STATUS ?? ""}</td>
        <td><!-- actions here --></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Failed to load management review data:", err);
  }
}
