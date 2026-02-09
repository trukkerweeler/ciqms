// ctareportweld.js
import { loadHeaderFooter, getApiUrl, displayDate } from "./utils.mjs";
// loadHeaderFooter();

let originalData = [];

createFilterInput((filterValue) => {
  const filteredData = originalData.filter(
    (row) => row.PEOPLE_ID && row.PEOPLE_ID.toString().includes(filterValue),
  );
  renderTable(filteredData, Object.keys(originalData[0] || {}));
});

function createFilterInput(onFilter) {
  const input = document.getElementById("peopleIdFilter");
  if (!input) return;
  input.addEventListener("input", (e) => {
    onFilter(e.target.value);
  });
}

function renderTable(data, headers) {
  const oldTable = document.querySelector("#main table");
  if (oldTable) oldTable.remove();

  const main = document.getElementById("main");
  const table = document.createElement("table");
  main.appendChild(table);
  const thead = document.createElement("thead");
  table.appendChild(thead);
  const headerRow = document.createElement("tr");
  thead.appendChild(headerRow);
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  data.forEach((row) => {
    const tr = document.createElement("tr");
    tbody.appendChild(tr);
    headers.forEach((header) => {
      const td = document.createElement("td");
      if (header.endsWith("DATE") || header === "DATE_TIME") {
        td.textContent = displayDate(row[header]);
      } else {
        td.textContent = row[header];
      }
      tr.appendChild(td);
    });
  });
}

(async () => {
  const apiUrl = await getApiUrl();
  const url = `${apiUrl}/reports/weld`;

  const months = [];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // get the data from the server and display it in a table
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      originalData = data; // Assign fetched data to global variable
      // console.log("Data fetched successfully:", originalData);

      const main = document.getElementById("main");
      const h1 = document.createElement("h1");
      h1.textContent = "Weld Training Report";
      main.appendChild(h1);

      // Render table using the same function as filtering
      renderTable(originalData, Object.keys(originalData[0] || {}));
    });
})();
