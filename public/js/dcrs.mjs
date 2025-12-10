import { loadHeaderFooter, myport, getUserValue } from "./utils.mjs";

// Constants
const PORT = myport() || 3003;
const BASE_URL = `http://localhost:${PORT}/requests`;
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
    (field) => !data[field] || data[field].trim() === ""
  );
  if (missingField) {
    throw new Error(
      `Please fill in the required field: ${missingField.replace(/_/g, " ")}`
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

// Table rendering functions
const createTableHeader = (record) => {
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  Object.keys(record).forEach((key) => {
    const th = document.createElement("th");
    th.textContent = key;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  return thead;
};

const createTableCell = (key, value) => {
  const td = document.createElement("td");

  if (DATE_FIELDS.includes(key)) {
    td.textContent = formatDate(value);
  } else if (key === "REQUEST_ID") {
    td.innerHTML = `<a href="http://localhost:${PORT}/dcr.html?id=${value}">${value}</a>`;
  } else {
    td.textContent = value ?? "";
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

const createFilterInput = () => {
  const filterInput = document.createElement("input");
  Object.assign(filterInput, {
    id: "dcrFilter",
    type: "text",
    placeholder: "Filter records...",
  });
  Object.assign(filterInput.style, {
    width: "300px",
    padding: "8px",
    fontSize: "14px",
    borderRadius: "4px",
    border: "1px solid #ccc",
  });
  return filterInput;
};

const attachFilterListener = (filterInput, tableBody, records) => {
  filterInput.addEventListener("input", (e) => {
    const filterValue = e.target.value.toLowerCase();
    const filteredData = records.filter((record) =>
      Object.values(record).some((value) =>
        (value ?? "").toString().toLowerCase().includes(filterValue)
      )
    );

    tableBody.innerHTML = "";
    filteredData.forEach((record) => {
      tableBody.appendChild(createTableRow(record));
    });
  });
};

const renderTable = (records, allRecords = null) => {
  const main = document.querySelector("main");

  if (!records?.length) {
    main.innerHTML = "<p>No records found.</p>";
    return;
  }

  // Create filter container
  let filterContainer = getDialog("filterContainer");
  if (!filterContainer) {
    filterContainer = document.createElement("div");
    filterContainer.id = "filterContainer";
    Object.assign(filterContainer.style, {
      padding: "10px",
      borderBottom: "1px solid #ddd",
    });

    const filterInput = createFilterInput();
    filterContainer.appendChild(filterInput);
    main.appendChild(filterContainer);
  }

  // Create table wrapper
  const tableWrapper = document.createElement("div");
  Object.assign(tableWrapper.style, {
    height: "calc(75vh - 60px)",
    overflowY: "auto",
    overflowX: "auto",
    border: "1px solid #ddd",
  });

  // Create table
  const table = document.createElement("table");
  table.id = "dcrTable";
  table.appendChild(createTableHeader(records[0]));

  const tbody = document.createElement("tbody");
  tbody.id = "dcrTableBody";
  records.forEach((record) => {
    tbody.appendChild(createTableRow(record));
  });
  table.appendChild(tbody);

  tableWrapper.appendChild(table);
  main.appendChild(tableWrapper);

  // Attach filter
  const filterInput = document.getElementById("dcrFilter");
  const dataToFilter = allRecords || records;
  attachFilterListener(filterInput, tbody, dataToFilter);
};

const getRecords = async () => {
  try {
    const records = await fetchRecords();
    document.querySelector("main").innerHTML = "";
    renderTable(records, records);
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
      getUserValue(),
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
