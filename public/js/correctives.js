import { loadHeaderFooter, myport } from "./utils.mjs";
loadHeaderFooter();
const port = myport() || 3004;
const year = new Date().getFullYear();
let sortOrder = "asc";

const url = `http://localhost:${port}/corrective`;

document.addEventListener("DOMContentLoaded", () => {
  fetch(url, { method: "GET" })
    .then((response) => response.json())
    .then((data) => {
      createTable(data);
    })
    .catch((error) => console.error("Error fetching data:", error));
});

function createTable(data) {
  const table = document.createElement("table");
  table.className = "table table-striped table-bordered table-hover";
  table.style.marginBottom = "0"; // Remove default table margin

  const headers = Object.keys(data[0]);
  const thead = document.createElement("thead");
  thead.style.position = "sticky"; // Make header sticky
  thead.style.top = "0"; // Stick to top of container
  thead.style.backgroundColor = "#f8f9fa"; // Light background for header
  thead.style.zIndex = "10"; // Ensure header stays on top

  const tbody = document.createElement("tbody");

  // Create table headers
  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    // Header aliases
    switch (header) {
      case "USER_DEFINED_1":
        header = "UD1";
        break;
      case "USER_DEFINED_2":
        header = "UD2";
        break;
      default:
        break;
    }
    th.textContent = header;
    th.addEventListener("click", () => sortTable(table, header));
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create table rows
  data.forEach((item) => {
    const row = document.createElement("tr");
    headers.forEach((header) => {
      const td = document.createElement("td");
      // if the word 'date' is in the header, format the date
      if (header.toLowerCase().includes("date")) {
        // if the date is null, display an empty string
        if (item[header] === null) {
          td.textContent = "";
        } else {
          td.textContent = new Date(item[header]).toLocaleDateString();
        }
      } else if (header == "CORRECTIVE_ID") {
        td.innerHTML = `<a href="http://localhost:${port}/corrective.html?id=${item[header]}">${item[header]}</a>`;
      } else {
        td.textContent = item[header];
      }
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  // Create a scrollable container for the table
  const tableContainer = document.createElement("div");
  tableContainer.className = "table-container";
  // Calculate height to account for footer (footer height ~50px + some padding)
  tableContainer.style.maxHeight = "calc(80vh - 60px)"; // Increased height due to compact header
  tableContainer.style.overflowY = "auto"; // Enable vertical scrolling
  tableContainer.style.overflowX = "auto"; // Enable horizontal scrolling if needed
  tableContainer.style.border = "1px solid #ddd"; // Add border for better visual separation
  tableContainer.style.borderRadius = "4px"; // Add rounded corners
  tableContainer.style.marginTop = "10px"; // Add some top margin
  tableContainer.style.marginBottom = "80px"; // Add bottom margin to clear footer

  // Append the table to the container, then container to the main element
  tableContainer.appendChild(table);
  document.querySelector("main").appendChild(tableContainer);
}

function sortTable(table, column) {
  const rows = Array.from(table.querySelectorAll("tbody tr"));
  const columnIndex = Array.from(table.querySelectorAll("th")).findIndex(
    (th) => th.textContent === column
  );
  const sortedRows = rows.sort((a, b) => {
    const aText = a.children[columnIndex].textContent;
    const bText = b.children[columnIndex].textContent;
    return sortOrder === "asc"
      ? aText.localeCompare(bText)
      : bText.localeCompare(aText);
  });

  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  sortedRows.forEach((row) => tbody.appendChild(row));

  // Toggle sort order for next click
  sortOrder = sortOrder === "asc" ? "desc" : "asc";
}
