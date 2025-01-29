import { loadHeaderFooter, myport } from "./utils.mjs";
// loadHeaderFooter();
import { displayDate } from "./utils.mjs";

const port = myport() || 3003;
const url = `http://localhost:${port}/reports/cta`;

const months = [];
const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

// get the data from the server and display it in a table
fetch(url)
    .then((response) => response.json())
    .then((data) => {
        const main = document.getElementById("main");
        const h1 = document.createElement("h1");
        h1.textContent = "Training Report" + " " + currentYear;
        main.appendChild(h1);
        const table = document.createElement("table");
        main.appendChild(table);
        const thead = document.createElement("thead");
        table.appendChild(thead);
        const headerRow = document.createElement("tr");
        thead.appendChild(headerRow);
        const headers = Object.keys(data[0]);
        headers.forEach((header) => {
        const th = document.createElement("th");
        th.textContent = header;
        headerRow.appendChild(th);
        }
        );

        const tbody = document.createElement("tbody");
        table.appendChild(tbody);
        data.forEach((row) => {
        const tr = document.createElement("tr");
        tbody.appendChild(tr);
        headers.forEach((header) => {
            const td = document.createElement("td");
            // if the column ends with "DATE" then format it as a date
            if (header.endsWith("DATE") || header === "DATE_TIME") {
            td.textContent = displayDate(row[header]);
            } else {
                td.textContent = row[header];
            }
            tr.appendChild(td);
        });
        });
    });