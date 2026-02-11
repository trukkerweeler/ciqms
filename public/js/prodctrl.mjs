import { loadHeaderFooter, getSessionUser, myport } from "./utils.mjs";
loadHeaderFooter();
const user = await getSessionUser();
const port = myport();

async function loadTable() {
  // Fetch and parse the JSON file
  const response = await fetch("./json/prodctrl.json");
  const items = await response.json();

  // Create table and header
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["code", "description"].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create table body
  const tbody = document.createElement("tbody");
  items.forEach((obj) => {
    const row = document.createElement("tr");
    ["code", "description"].forEach((key) => {
      const td = document.createElement("td");
      td.textContent = obj[key] ?? "";
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  // Append table to main
  document.querySelector("main").appendChild(table);
}

loadTable();
