const addForm = document.getElementById("add-reminder-form");
const filterForm = document.getElementById("filter-form");
const filterInput = document.getElementById("operation-filter");
const clearFilterButton = document.getElementById("clear-filter");
const status = document.getElementById("status");
const results = document.getElementById("reminder-results");
const recordCount = document.getElementById("record-count");
const addDialog = document.getElementById("add-reminder-dialog");
const openAddReminderButton = document.getElementById("open-add-reminder");
const closeAddReminderButton = document.getElementById("close-add-reminder");

function showStatus(message, type = "") {
  status.textContent = message;
  status.className = `status ${type}`.trim();
}

function createInput(value, className) {
  const input = document.createElement("input");
  input.value = value ?? "";
  input.className = className;
  return input;
}

function createTextarea(value) {
  const textarea = document.createElement("textarea");
  textarea.value = value ?? "";
  textarea.rows = 3;
  textarea.maxLength = 2000;
  textarea.className = "inline-reminder-text";
  return textarea;
}

function createActionButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = className;
  button.addEventListener("click", onClick);
  return button;
}

function renderRows(reminders) {
  results.replaceChildren();
  recordCount.textContent = `${reminders.length} record${reminders.length === 1 ? "" : "s"}`;

  if (reminders.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No reminders match this operation code.";
    results.appendChild(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "reminders-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">JOBBER ID</th>
        <th scope="col">Revision</th>
        <th scope="col">Operation code</th>
        <th scope="col">Reminder</th>
        <th scope="col">Status</th>
        <th scope="col">Actions</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector("tbody");
  reminders.forEach((reminder) => body.appendChild(createRow(reminder)));
  results.appendChild(table);
}

function createRow(reminder) {
  const row = document.createElement("tr");
  row.dataset.jobberId = reminder.JOBBER_ID;
  row.innerHTML = `
    <td class="jobber-id"></td>
    <td class="revision"></td>
    <td class="operation-code"></td>
    <td class="reminder-content"></td>
    <td class="active-status"></td>
    <td class="row-actions"></td>
  `;
  row.querySelector(".jobber-id").textContent = reminder.JOBBER_ID;
  row.querySelector(".revision").textContent = reminder.REVISION;
  row.querySelector(".operation-code").textContent = reminder.OPERATION_CODE;
  row.querySelector(".reminder-content").textContent = reminder.REMINDER_TEXT;
  row.querySelector(".active-status").textContent = reminder.ACTIVE
    ? "Active"
    : "Inactive";

  const actions = row.querySelector(".row-actions");
  actions.appendChild(
    createActionButton("Edit", "row-button", () => beginEdit(row, reminder)),
  );
  if (reminder.ACTIVE) {
    actions.appendChild(
      createActionButton("Delete", "row-button danger-button", () =>
        deleteReminder(reminder.JOBBER_ID),
      ),
    );
  }
  return row;
}

function beginEdit(row, reminder) {
  const operationCell = row.querySelector(".operation-code");
  const textCell = row.querySelector(".reminder-content");
  const statusCell = row.querySelector(".active-status");
  const actionsCell = row.querySelector(".row-actions");
  const operationInput = createInput(
    reminder.OPERATION_CODE,
    "inline-operation-code",
  );
  const textInput = createTextarea(reminder.REMINDER_TEXT);
  const activeInput = document.createElement("input");
  activeInput.type = "checkbox";
  activeInput.checked = Boolean(reminder.ACTIVE);
  const activeLabel = document.createElement("label");
  activeLabel.className = "inline-active";
  activeLabel.append(activeInput, document.createTextNode(" Active"));

  operationCell.replaceChildren(operationInput);
  textCell.replaceChildren(textInput);
  statusCell.replaceChildren(activeLabel);
  actionsCell.replaceChildren(
    createActionButton("Save", "row-button", () =>
      saveEdit(row, reminder, operationInput, textInput, activeInput),
    ),
    createActionButton("Cancel", "row-button secondary-button", () =>
      row.replaceWith(createRow(reminder)),
    ),
  );
  operationInput.focus();
}

async function saveEdit(row, reminder, operationInput, textInput, activeInput) {
  const operationCode = operationInput.value.trim();
  const reminderText = textInput.value.trim();
  if (!operationCode || !reminderText) {
    showStatus("Operation code and reminder text are required.", "error");
    return;
  }

  await sendReminderRequest(
    `/shop-reminder/reminders/${encodeURIComponent(reminder.JOBBER_ID)}`,
    "PUT",
    { operationCode, reminderText, active: activeInput.checked },
    "Reminder revision saved.",
  );
}

async function deleteReminder(jobberId) {
  if (!window.confirm(`Delete reminder ${jobberId}?`)) return;
  await sendReminderRequest(
    `/shop-reminder/reminders/${encodeURIComponent(jobberId)}`,
    "DELETE",
    null,
    "Reminder deleted.",
  );
}

async function sendReminderRequest(url, method, body, successMessage) {
  showStatus("Saving reminder...", "loading");
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Reminder operation failed.");
    showStatus(successMessage, "success");
    await loadReminders();
    return true;
  } catch (error) {
    showStatus(error.message, "error");
    return false;
  }
}

async function loadReminders() {
  showStatus("Loading reminders...", "loading");
  const operationCode = filterInput.value.trim();
  try {
    const response = await fetch(
      `/shop-reminder/reminders/admin?operationCode=${encodeURIComponent(operationCode)}`,
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Unable to load reminders.");
    renderRows(data);
    showStatus(`${data.length} reminder record(s) loaded.`, "success");
  } catch (error) {
    showStatus(error.message, "error");
  }
}

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const operationCode = document
    .getElementById("add-operation-code")
    .value.trim();
  const reminderText = document
    .getElementById("add-reminder-text")
    .value.trim();
  if (!operationCode || !reminderText) return;

  const saved = await sendReminderRequest(
    "/shop-reminder/reminders",
    "POST",
    { operationCode, reminderText },
    "Reminder created.",
  );
  if (saved) {
    addForm.reset();
    addDialog.close();
  }
});

openAddReminderButton.addEventListener("click", () => {
  addDialog.showModal();
  document.getElementById("add-operation-code").focus();
});

closeAddReminderButton.addEventListener("click", () => {
  addForm.reset();
  addDialog.close();
});

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadReminders();
});

clearFilterButton.addEventListener("click", () => {
  filterInput.value = "";
  loadReminders();
});

loadReminders();
