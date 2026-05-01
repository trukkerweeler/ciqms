import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

document
  .querySelector("#subjectFilter")
  .addEventListener("keyup", function (event) {
    const filter = event.target.value.toLowerCase();
    const rows = document.querySelectorAll("tbody tr");

    rows.forEach((row) => {
      const createdCell = row.querySelector("td:nth-child(1)"); // Assuming INPUT_DATE is the first column
      if (createdCell) {
        const year = new Date(createdCell.textContent).getFullYear().toString();
        if (year.includes(filter)) {
          row.style.display = "";
        } else {
          row.style.display = "none";
        }
      }
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
          // Format INPUT_DATE to show only the date part (YYYY-MM-DD)
          if (key === "INPUT_DATE" && record[key]) {
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
