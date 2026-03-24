import {
  loadHeaderFooter,
  getSessionUser,
  getDateTime,
  getApiUrl,
} from "./utils.mjs";

// Function to filter records by date range
function filterByDateRange(records, dateRange) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let rangeInDays = 0;
  if (dateRange !== "overdue") {
    rangeInDays = parseInt(dateRange);
  }

  return records.filter((record) => {
    if (!record.DATE_DUE) return false;

    const dueDate = new Date(record.DATE_DUE);
    dueDate.setHours(0, 0, 0, 0);

    const dueBy = new Date(today);
    dueBy.setDate(dueBy.getDate() + rangeInDays);

    return dueDate <= dueBy;
  });
}

// Function to filter records by record type
function filterByRecordType(records, recordType) {
  if (recordType === "all") {
    return records;
  }
  return records.filter((record) => record.RECORD_TYPE === recordType);
}

// Function to apply both filters
function applyFilters(records, dateRange, recordType) {
  let filtered = filterByDateRange(records, dateRange);
  filtered = filterByRecordType(filtered, recordType);
  return filtered;
}

// Function to render the table
function renderTable(records, main, apiUrl) {
  // Delete the child nodes of the main element
  while (main.firstChild) {
    main.removeChild(main.firstChild);
  }

  if (records.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No records found.";
    main.appendChild(p);
    return;
  }

  let fieldList = [
    "record_id",
    "INPUT_DATE",
    "ASSIGNED_TO",
    "TODO_TEXT",
    "RECORD_TYPE",
    "DATE_DUE",
  ];

  // Field aliases for display
  const fieldAliases = {
    RECORD_TYPE: "Type",
  };

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const header = document.createElement("tr");
  const td = document.createElement("td");

  // Create the table header
  for (let key in records[0]) {
    if (fieldList.includes(key)) {
      const th = document.createElement("th");
      th.textContent = fieldAliases[key] || key;
      th.style.width = [
        "record_id",
        "ASSIGNED_TO",
        "RECORD_TYPE",
        "INPUT_DATE",
        "DATE_DUE",
      ].includes(key)
        ? "100px"
        : "auto";
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
          if (row[field] === null) {
            td.textContent = "";
          } else {
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
          } else if (row["RECORD_TYPE"] === "AUDIT") {
            a.href = `${apiUrl}/document.html?document_id=${row[field]}`;
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
}

document.addEventListener("DOMContentLoaded", async () => {
  const apiUrl = await getApiUrl();
  loadHeaderFooter();
  const user = await getSessionUser();

  // Default the ASSIGNED_TO field to the current user
  document.getElementById("ASSIGNED_TO").value = user;

  const main = document.querySelector("main");
  const iid = document.querySelector("#iid");
  let allRecords = []; // Store all records for filtering

  const button = document.getElementById("todoButton");
  button.addEventListener("click", async (event) => {
    event.preventDefault();

    let personid = document.getElementById("ASSIGNED_TO").value;
    personid = personid.toUpperCase();

    const url = `${apiUrl}/todo`;

    fetch(url, { method: "GET" })
      .then((response) => response.json())
      .then((records) => {
        // filter the records to only show the ones that are assigned to the user
        records = records.filter((record) => record.ASSIGNED_TO === personid);
        allRecords = records; // Store for reuse when filtering by date and type

        // Get selected filters
        const dateRange = document.querySelector(
          'input[name="dateRange"]:checked',
        ).value;
        const recordType = document.querySelector(
          'input[name="recordType"]:checked',
        ).value;
        const filteredRecords = applyFilters(records, dateRange, recordType);

        renderTable(filteredRecords, main, apiUrl);
      });
  });

  // Add event listeners for date range radio buttons
  const dateRangeRadios = document.querySelectorAll('input[name="dateRange"]');
  dateRangeRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (allRecords.length > 0) {
        const dateRange = document.querySelector(
          'input[name="dateRange"]:checked',
        ).value;
        const recordType = document.querySelector(
          'input[name="recordType"]:checked',
        ).value;
        const filteredRecords = applyFilters(allRecords, dateRange, recordType);
        renderTable(filteredRecords, main, apiUrl);
      }
    });
  });

  // Add event listeners for record type radio buttons
  const recordTypeRadios = document.querySelectorAll(
    'input[name="recordType"]',
  );
  recordTypeRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (allRecords.length > 0) {
        const dateRange = document.querySelector(
          'input[name="dateRange"]:checked',
        ).value;
        const recordType = document.querySelector(
          'input[name="recordType"]:checked',
        ).value;
        const filteredRecords = applyFilters(allRecords, dateRange, recordType);
        renderTable(filteredRecords, main, apiUrl);
      }
    });
  });
});
