import { getApiUrl, loadHeaderFooter } from "./utils.mjs";

loadHeaderFooter();

let actionItems = [];

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("searchInput").addEventListener("input", renderTable);
  document
    .getElementById("printBtn")
    .addEventListener("click", () => window.print());
  document.getElementById("exportBtn").addEventListener("click", exportToCsv);

  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}/input/pm-open-overdue`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    actionItems = await response.json();
    document.getElementById("reportTimestamp").textContent =
      `Generated: ${new Date().toLocaleString()}`;
    renderTable();
  } catch (error) {
    console.error("Error loading overdue PM action items:", error);
    const container = document.getElementById("pmOverdueTableContainer");
    container.replaceChildren();
    const message = document.createElement("p");
    message.className = "no-data-message error";
    message.textContent =
      "Failed to load overdue PM action items. Please refresh the page.";
    container.appendChild(message);
  }
});

function renderTable() {
  const container = document.getElementById("pmOverdueTableContainer");
  const filter = document
    .getElementById("searchInput")
    .value.trim()
    .toLowerCase();
  const visibleItems = actionItems.filter((item) =>
    [item.INPUT_ID, item.SUBJECT, item.ASSIGNED_TO, item.INPUT_TEXT].some(
      (value) => String(value || "").toLowerCase().includes(filter),
    ),
  );

  container.replaceChildren();
  if (visibleItems.length === 0) {
    const message = document.createElement("p");
    message.className = "no-data-message";
    message.textContent = filter
      ? "No overdue PM action items match your search."
      : "No PM action items are more than 30 days overdue.";
    container.appendChild(message);
    return;
  }

  const table = document.createElement("table");
  table.className = "repairs-table";
  const columns = [
    ["INPUT_ID", "ID"],
    ["INPUT_DATE", "Date"],
    ["SUBJECT", "Subject"],
    ["ASSIGNED_TO", "Assigned To"],
    ["DUE_DATE", "Due Date"],
    ["DAYS_OVERDUE", "Days Overdue"],
    ["INPUT_TEXT", "Details"],
  ];

  const headerRow = table.createTHead().insertRow();
  columns.forEach(([, label]) => {
    const header = document.createElement("th");
    header.textContent = label;
    headerRow.appendChild(header);
  });

  const tbody = table.createTBody();
  visibleItems.forEach((item) => {
    const row = tbody.insertRow();
    columns.forEach(([key]) => {
      const cell = row.insertCell();
      if (key === "DAYS_OVERDUE") {
        cell.className = "status-overdue";
        cell.textContent = String(daysOverdue(item.DUE_DATE));
      } else if (key === "INPUT_DATE" || key === "DUE_DATE") {
        cell.textContent = formatDate(item[key]);
        if (key === "DUE_DATE") cell.className = "status-overdue";
      } else {
        cell.textContent = item[key] == null ? "" : String(item[key]);
        if (key === "INPUT_TEXT") cell.className = "truncate-text";
      }
    });
  });

  container.appendChild(table);
}

function dateOnly(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysOverdue(value) {
  const dueDate = dateOnly(value);
  if (!dueDate) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today - dueDate) / 86400000);
}

function formatDate(value) {
  const date = dateOnly(value);
  return date
    ? date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
}

function exportToCsv() {
  if (actionItems.length === 0) {
    window.alert("No data to export");
    return;
  }

  const columns = [
    ["INPUT_ID", "ID"],
    ["INPUT_DATE", "Date"],
    ["SUBJECT", "Subject"],
    ["ASSIGNED_TO", "Assigned To"],
    ["DUE_DATE", "Due Date"],
    ["DAYS_OVERDUE", "Days Overdue"],
    ["INPUT_TEXT", "Details"],
  ];
  const csvRows = [
    columns.map(([, label]) => label),
    ...actionItems.map((item) =>
      columns.map(([key]) =>
        key === "DAYS_OVERDUE"
          ? daysOverdue(item.DUE_DATE)
          : item[key] == null
            ? ""
            : item[key],
      ),
    ),
  ];
  const csv = csvRows
    .map((row) =>
      row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
    )
    .join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pm-open-overdue-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
