import {
  loadHeaderFooter,
  myport,
  getSessionUser,
  getApiUrl,
} from "./utils.mjs";

// Constants
const apiUrl = await getApiUrl();
const BASE_URL = `${apiUrl}/requests`;
const REQUIRED_FIELDS = [
  "DOCUMENT_ID",
  "CHANGE_TYPE",
  "REQUEST_TEXT",
  "CREATE_BY",
];
const DATE_FIELDS = [
  "DUE_DATE",
  "CLOSED_DATE",
  "DECISION_DATE",
  "REQUEST_DATE",
];
const CLOSED_FILTER_NAME = "closedDcrFilter";

let dcrRecords = [];

// Helper functions
const formatDate = (dateString) =>
  dateString && dateString !== "" ? dateString.slice(0, 10) : "";

const getTodayISO = () => new Date().toISOString().split("T")[0];

const getDueDateISO = (daysFromNow = 30) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
};

const validateRequiredFields = (data) => {
  const missingField = REQUIRED_FIELDS.find(
    (field) => !data[field] || data[field].trim() === "",
  );
  if (missingField) {
    throw new Error(
      `Please fill in the required field: ${missingField.replace(/_/g, " ")}`,
    );
  }
};

// Dialog management
const getDialog = (dialogId) => document.getElementById(dialogId);

const openDialog = (dialogId) => {
  const dialog = getDialog(dialogId);
  dialog?.showModal();
};

const closeDialog = (dialogId) => {
  const dialog = getDialog(dialogId);
  dialog?.close();
};

const setupDialogEventListeners = (dialog) => {
  const handleOutsideClick = (e) => {
    if (e.target === dialog) {
      dialog.close();
    }
  };

  const handleEscapeKey = (e) => {
    if (e.key === "Escape") {
      dialog.close();
    }
  };

  dialog.addEventListener("click", handleOutsideClick);
  dialog.addEventListener("keydown", handleEscapeKey);
};

// API functions
const checkResponse = async (response) => {
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
  }
  return response.json();
};

const getNextRequestId = () => fetch(`${BASE_URL}/nextId`).then(checkResponse);

const createRequest = (requestData) =>
  fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestData),
  }).then(checkResponse);

const fetchRecords = () =>
  fetch(BASE_URL, { method: "GET" }).then(checkResponse);

const isClosedRecord = (record) =>
  (record?.CLOSED ?? "").toString().trim().toUpperCase() === "Y";

const getClosedFilterValue = () =>
  document.querySelector(`input[name="${CLOSED_FILTER_NAME}"]:checked`)
    ?.value ?? "hide";

const getTextFilterValue = () =>
  document.getElementById("dcrFilter")?.value.toLowerCase() ?? "";

const filterRecords = (records) => {
  const showClosed = getClosedFilterValue() === "show";
  const filterValue = getTextFilterValue();

  return records.filter((record) => {
    if (!showClosed && isClosedRecord(record)) {
      return false;
    }

    if (!filterValue) {
      return true;
    }

    return Object.values(record).some((value) =>
      (value ?? "").toString().toLowerCase().includes(filterValue),
    );
  });
};

// Table rendering functions
const getColumnClass = (key) =>
  `dcr-col-${key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const createTableHeader = (record) => {
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  Object.keys(record).forEach((key) => {
    const th = document.createElement("th");
    th.className = getColumnClass(key);
    th.textContent = key;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  return thead;
};

const createTableCell = (key, value) => {
  const td = document.createElement("td");
  td.className = getColumnClass(key);

  if (DATE_FIELDS.includes(key)) {
    td.textContent = formatDate(value);
  } else if (key === "REQUEST_ID") {
    td.innerHTML = `<a href="./dcr.html?id=${value}">${value}</a>`;
  } else {
    td.textContent = value ?? "";
  }

  if (key === "REQUEST_TEXT") {
    td.title = value ?? "";
  }

  return td;
};

const createTableRow = (record) => {
  const tr = document.createElement("tr");
  Object.entries(record).forEach(([key, value]) => {
    tr.appendChild(createTableCell(key, value));
  });
  return tr;
};

const createNoRecordsRow = (columnCount) => {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = columnCount;
  td.textContent = "No matching DCR records found.";
  tr.appendChild(td);
  return tr;
};

const createFilterInput = () => {
  const filterInput = document.createElement("input");
  Object.assign(filterInput, {
    id: "dcrFilter",
    type: "text",
    placeholder: "Filter records...",
  });
  filterInput.className = "dcr-text-filter";
  return filterInput;
};

const updateTableRows = (tableBody, records) => {
  tableBody.innerHTML = "";
  const filteredData = filterRecords(records);

  if (!filteredData.length) {
    tableBody.appendChild(createNoRecordsRow(Object.keys(records[0]).length));
    return;
  }

  filteredData.forEach((record) => {
    tableBody.appendChild(createTableRow(record));
  });
};

const renderTable = (records) => {
  const main = document.querySelector("main");

  if (!records?.length) {
    main.innerHTML = "<p>No records found.</p>";
    return;
  }

  // Add text filter to the status filter row
  const filterContainer = getDialog("dcrStatusFilter");
  let filterInput = document.getElementById("dcrFilter");
  if (filterContainer && !filterInput) {
    filterInput = createFilterInput();
    const statusLabel = filterContainer.querySelector("label:nth-of-type(2)");
    filterContainer.insertBefore(filterInput, statusLabel);
  }

  // Create table wrapper
  const tableWrapper = document.createElement("div");
  tableWrapper.className = "table-container";

  // Create table
  const table = document.createElement("table");
  table.id = "dcrTable";
  table.appendChild(createTableHeader(records[0]));

  const tbody = document.createElement("tbody");
  tbody.id = "dcrTableBody";
  updateTableRows(tbody, records);
  table.appendChild(tbody);

  tableWrapper.appendChild(table);
  main.appendChild(tableWrapper);

  // Attach filter
  if (filterInput) {
    filterInput.oninput = () => {
      updateTableRows(tbody, records);
    };
  }
};

const getRecords = async () => {
  try {
    const records = await fetchRecords();
    dcrRecords = records;
    document.querySelector("main").innerHTML = "";
    renderTable(records);
  } catch (error) {
    console.error("Error fetching records:", error);
    document.querySelector("main").innerHTML =
      "<p>Error loading records. Please try again.</p>";
  }
};

// Form submission handler
const handleFormSubmit = async (e) => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const requestData = Object.fromEntries(formData.entries());

  try {
    validateRequiredFields(requestData);

    const [nextId, user] = await Promise.all([
      getNextRequestId(),
      getSessionUser(),
    ]);

    Object.assign(requestData, {
      REQUEST_ID: nextId,
      CREATE_DATE: getTodayISO(),
      REQUEST_DATE: getTodayISO(),
      DUE_DATE: getDueDateISO(30),
      CREATE_BY: user,
    });

    await createRequest(requestData);
    closeDialog("docRequestDialog");
    form.reset();
    await getRecords();
  } catch (error) {
    console.error("Error creating request:", error);
    alert(error.message || "Error creating request. Please try again.");
  }
};

// Event listeners setup
const setupEventListeners = () => {
  const addRequestBtn = getDialog("addrequestlink");
  const cancelBtn = getDialog("cancelRequestDialog");
  const docRequestForm = getDialog("docRequestForm");
  const dialog = getDialog("docRequestDialog");

  document
    .querySelectorAll(`input[name="${CLOSED_FILTER_NAME}"]`)
    .forEach((filterOption) => {
      filterOption.addEventListener("change", () => {
        const tableBody = document.getElementById("dcrTableBody");
        if (tableBody && dcrRecords.length) {
          updateTableRows(tableBody, dcrRecords);
        }
      });
    });

  addRequestBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    openDialog("docRequestDialog");
    dialog && setupDialogEventListeners(dialog);
  });

  cancelBtn?.addEventListener("click", () => closeDialog("docRequestDialog"));
  docRequestForm?.addEventListener("submit", handleFormSubmit);
};

// Initialize the application
const init = async () => {
  loadHeaderFooter();
  setupEventListeners();
  await getRecords();
};

// Start the app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
