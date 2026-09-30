const form = document.getElementById("jobber-form");
const status = document.getElementById("status");
const results = document.getElementById("results");
let remindersByCode = new Map();

function clearResults() {
  results.replaceChildren();
}

function showMessage(message, type = "") {
  status.textContent = message;
  status.className = `status ${type}`.trim();
}

function renderOperations(data) {
  clearResults();

  const heading = document.createElement("h2");
  heading.textContent = `Operations for ${data.job}-${data.suffix}`;
  results.appendChild(heading);

  if (!data.operations.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No operations were found for this JOB and SUFFIX.";
    results.appendChild(empty);
    return;
  }

  const table = document.createElement("table");
  table.className = "operations-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">Operation number</th>
        <th scope="col">Operation code</th>
        <th scope="col">Description</th>
        <th scope="col">Inspection reminders</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const body = table.querySelector("tbody");
  data.operations.forEach((operation) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td></td>
      <td class="operation-code"></td>
      <td></td>
      <td class="reminder-cell"></td>
    `;
    row.children[0].textContent = operation.OPERATION_NUMBER ?? "";
    row.children[1].textContent = operation.OPERATION_CODE ?? "";
    row.children[2].textContent = operation.DESCRIPTION ?? "";
    const reminderCell = row.children[3];
    const codeReminders = remindersByCode.get(operation.OPERATION_CODE) || [];
    codeReminders.forEach((reminder) => {
      const reminderItem = document.createElement("div");
      reminderItem.className = "reminder-item";
      const reminderTextNode = document.createElement("span");
      reminderTextNode.textContent = reminder.REMINDER_TEXT;
      reminderItem.appendChild(reminderTextNode);
      reminderCell.appendChild(reminderItem);
    });
    body.appendChild(row);
  });

  results.appendChild(table);
}

async function loadReminders(operationCodes) {
  if (operationCodes.length === 0) {
    remindersByCode = new Map();
    return;
  }
  const response = await fetch(
    `/shop-reminder/reminders?operationCodes=${encodeURIComponent(operationCodes.join(","))}`,
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to load reminders.");

  remindersByCode = new Map();
  data.forEach((reminder) => {
    const list = remindersByCode.get(reminder.OPERATION_CODE) || [];
    list.push(reminder);
    remindersByCode.set(reminder.OPERATION_CODE, list);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearResults();
  showMessage("Loading traveler operations...", "loading");

  const job = document.getElementById("job").value.trim();
  const suffix = document.getElementById("suffix").value.trim();

  try {
    const response = await fetch("/shop-reminder/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job, suffix }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to retrieve traveler operations.");
    }

    await loadReminders([
      ...new Set(data.operations.map((operation) => operation.OPERATION_CODE)),
    ]);
    renderOperations(data);
    showMessage(`${data.operations.length} operation(s) found.`, "success");
  } catch (error) {
    showMessage(error.message, "error");
  }
});
