import {
  loadHeaderFooter,
  getSessionUser,
  getDateTime,
  getApiUrl,
} from "./utils.mjs";

document.addEventListener("DOMContentLoaded", async () => {
  const apiUrl = await getApiUrl();
  loadHeaderFooter();
  const user = await getSessionUser();

  // Default the ASSIGNED_TO field to the current user
  document.getElementById("ASSIGNED_TO").value = user;

  const main = document.querySelector("main");
  const iid = document.querySelector("#iid");

  const button = document.getElementById("todoButton");
  button.addEventListener("click", async (event) => {
    event.preventDefault();
    // const pid = ASSIGNED_TO.value;

    let personid = document.getElementById("ASSIGNED_TO").value;
    // change personid to uppercase
    personid = personid.toUpperCase();
    // console.log(personid)

    const url = `${apiUrl}/todo`;

  // Delete the child nodes of the main element
  while (main.firstChild) {
    main.removeChild(main.firstChild);
  }

  fetch(url, { method: "GET" })
    .then((response) => response.json())
    .then((records) => {
      // console.log(records);
      // filter the records to only show the ones that are assigned to the user
      records = records.filter((record) => record.ASSIGNED_TO === personid);

      let fieldList = [
        "record_id",
        "INPUT_DATE",
        "ASSIGNED_TO",
        "TODO_TEXT",
        "DATE_DUE",
        "RECORD_TYPE",
      ];

      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");
      const header = document.createElement("tr");
      const td = document.createElement("td");

      // Create the table header
      for (let key in records[0]) {
        // console.log(key);
        if (fieldList.includes(key)) {
          const th = document.createElement("th");
          th.textContent = key;
          header.appendChild(th);
        }
      }
      thead.appendChild(header);

      // Create the table body
      for (const row of records) {
        const tr = document.createElement("tr");
        for (const field in row) {
          if (fieldList.includes(field)) {
            const td = document.createElement("td");
            td.textContent = row[field];

            // fix the date format
            if (field === "INPUT_DATE" || field === "DATE_DUE") {
              // console.log("Date: " + row[field]);
              if (row[field] === null) {
                td.textContent = "";
              } else {
                // const date = new Date(row[field]);
                td.textContent = row[field].slice(0, 10);
              }
            }

            if (field === "record_id") {
              td.textContent = "";
              const a = document.createElement("a");
              // match the case to RECORD_TYPE
              if (row["RECORD_TYPE"] === "INPUT") {
                a.href = `${apiUrl}/input.html?id=${row[field]}`;
              } else if (row["RECORD_TYPE"] === "DCR") {
                a.href = `${apiUrl}/dcr.html?id=${row[field]}`;
              } else if (row["RECORD_TYPE"] === "TODO") {
                a.href = `${apiUrl}/todo.html?id=${row[field]}`;
              } else {
                a.href = `${apiUrl}/ncm.html?id=${row[field]}`;
              }
              a.textContent = row[field];
              td.appendChild(a);
            }
            tr.appendChild(td);
          }

          tbody.appendChild(tr);
        }
      }
      table.appendChild(thead);
      table.appendChild(tbody);

      // Create scrollable container
      const tableContainer = document.createElement("div");
      tableContainer.className = "table-container";
      tableContainer.style.maxHeight = "calc(75vh - 60px)";
      tableContainer.style.overflowY = "auto";
      tableContainer.style.marginBottom = "2rem";

      // Add table to container and container to main
      tableContainer.appendChild(table);
      main.appendChild(tableContainer);
    });
});
