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
const formatDate = (dateString) => {
  return dateString && dateString !== "" ? dateString.slice(0, 10) : "";
};

const getTodayISO = () => new Date().toISOString().split("T")[0];

const getDueDateISO = (daysFromNow = 30) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
};

const validateRequiredFields = (data) => {
  for (const field of REQUIRED_FIELDS) {
    if (!data[field] || data[field].trim() === "") {
      throw new Error(
        `Please fill in the required field: ${field.replace(/_/g, " ")}`
      );
    }
  }
};

// Dialog management
const openDialog = (dialogId) => {
  const dialog = document.getElementById(dialogId);
  if (dialog) {
    dialog.showModal();
  }
};

const closeDialog = (dialogId) => {
  const dialog = document.getElementById(dialogId);
  if (dialog) {
    dialog.close();
  }
};

const setupDialogEventListeners = (dialog) => {
  // Close dialog on outside click
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      dialog.close();
    }
  });

  // Handle ESC key
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dialog.close();
    }
  });
};

// API functions
const getNextRequestId = async () => {
  const response = await fetch(`${BASE_URL}/nextId`);
  if (!response.ok) {
    throw new Error("Failed to get next request ID");
  }
  return response.json();
};

const createRequest = async (requestData) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    throw new Error("Failed to create request");
  }
  return response.json();
};

const fetchRecords = async () => {
  const response = await fetch(BASE_URL, { method: "GET" });
  if (!response.ok) {
    throw new Error("Failed to fetch records");
  }
  return response.json();
};

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

const createTableBody = (records) => {
  const tbody = document.createElement("tbody");

  records.forEach((record) => {
    const tr = document.createElement("tr");
    Object.entries(record).forEach(([key, value]) => {
      tr.appendChild(createTableCell(key, value));
    });
    tbody.appendChild(tr);
  });

  return tbody;
};

const renderTable = (records) => {
  const main = document.querySelector("main");
  main.innerHTML = "";

  if (!records || records.length === 0) {
    main.innerHTML = "<p>No records found.</p>";
    return;
  }

  const tableWrapper = document.createElement("div");
  tableWrapper.style.height = "75vh";
  tableWrapper.style.overflowY = "auto";
  tableWrapper.style.border = "1px solid #ddd";

  const table = document.createElement("table");
  table.appendChild(createTableHeader(records[0]));
  table.appendChild(createTableBody(records));

  tableWrapper.appendChild(table);
  main.appendChild(tableWrapper);
};

const getRecords = async () => {
  try {
    const records = await fetchRecords();
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

    const nextId = await getNextRequestId();
    const user = await getUserValue();

    Object.assign(requestData, {
      REQUEST_ID: nextId,
      CREATE_DATE: getTodayISO(),
      REQUEST_DATE: getTodayISO(),
      DUE_DATE: getDueDateISO(30),
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
  const addRequestBtn = document.getElementById("addrequestlink");
  const cancelBtn = document.getElementById("cancelRequestDialog");
  const docRequestForm = document.getElementById("docRequestForm");
  const dialog = document.getElementById("docRequestDialog");

  if (addRequestBtn) {
    addRequestBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openDialog("docRequestDialog");
      if (dialog) {
        setupDialogEventListeners(dialog);
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => closeDialog("docRequestDialog"));
  }

  if (docRequestForm) {
    docRequestForm.addEventListener("submit", handleFormSubmit);
  }
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
