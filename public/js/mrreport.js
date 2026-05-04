import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

document
  .querySelector("#subjectFilter")
  .addEventListener("keyup", function (event) {
    const filter = event.target.value.toLowerCase();
    const rows = document.querySelectorAll("tbody tr");

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length === 0) return;

      // Get the data from row cells - map to column names from header
      const headers = document.querySelectorAll("thead th");
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header.textContent] = cells[index]?.textContent || "";
      });

      // Always show open records (CLSD = 'N')
      if (rowData["CLSD"] === "N") {
        row.style.display = "";
        return;
      }

      // For closed records, check both INPUT_DATE and CLOSED_DATE
      let shouldShow = false;

      if (filter === "") {
        shouldShow = true;
      } else {
        // Check INPUT_DATE year
        if (rowData["INPUT_DATE"]) {
          const createdYear = new Date(rowData["INPUT_DATE"])
            .getFullYear()
            .toString();
          if (createdYear.includes(filter)) {
            shouldShow = true;
          }
        }

        // Check CLOSED_DATE year
        if (!shouldShow && rowData["CLOSED_DATE"]) {
          const closedYear = new Date(rowData["CLOSED_DATE"])
            .getFullYear()
            .toString();
          if (closedYear.includes(filter)) {
            shouldShow = true;
          }
        }
      }

      row.style.display = shouldShow ? "" : "none";
    });
  });

async function getRecords() {
  const main = document.querySelector("main");
  const apiUrl = await getApiUrl();
  const url = `${apiUrl}/reports/mr`;

  fetch(url, { method: "GET" })
    .then((response) => response.json())
    .then((records) => {
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");
      const header = document.createElement("tr");

      if (records.length > 0) {
        for (let key in records[0]) {
          const th = document.createElement("th");
          th.textContent = key;
          header.appendChild(th);
        }
      }
      thead.appendChild(header);

      for (let record of records) {
        const tr = document.createElement("tr");
        for (let key in record) {
          const td = document.createElement("td");
          // Format date fields to show only the date part (YYYY-MM-DD)
          if ((key === "INPUT_DATE" || key === "CLOSED_DATE") && record[key]) {
            const date = new Date(record[key]);
            td.textContent = date.toISOString().split("T")[0];
          } else {
            td.textContent = record[key];
          }
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(thead);
      table.appendChild(tbody);
      main.appendChild(table);
    })
    .catch((error) => {
      console.error("Error fetching records:", error);
      main.textContent = "Error loading report data";
    });
}

getRecords();
