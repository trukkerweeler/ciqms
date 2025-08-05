import { myport } from "./utils.mjs";

const port  = myport() || 3003;
const url = `http://localhost:${port}/opcodes`;

let allData = [];

function getMachineNoInput() {
  const machineInput = document.getElementById("machineNo");
  return machineInput ? machineInput.value.trim().toLowerCase() : "";
}

function filterData() {
  const machineNo = getMachineNoInput();
  return machineNo
    ? allData.filter(record => String(record.MACHINE || '').toLowerCase().startsWith(machineNo))
    : allData;
}

function updateTable() {
  renderTable(filterData());
}

async function fetchData() {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Network response was not ok (${response.status} ${response.statusText}): ${errorText}`);
    }

    allData = await response.json();
    updateTable();
  } catch (error) {
    console.error("Error fetching OP_CODES data:", error);
  }
}

function renderTable(data) {
  const oldTable = document.getElementById('opcodes');
  if (oldTable) oldTable.remove();

  if (!data.length) return;

  const table = document.createElement('table');
  table.id = 'opcodes';
  table.className = 'table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  Object.keys(data[0]).forEach(key => {
    const th = document.createElement('th');
    th.textContent = key;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach(record => {
    const row = document.createElement('tr');
    Object.values(record).forEach(value => {
      const td = document.createElement('td');
      td.textContent = value;
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  const tableContainer = document.getElementById('opcodesTable') || document.querySelector('main');
  tableContainer.appendChild(table);
}

document.addEventListener('DOMContentLoaded', () => {
  const machineInput = document.getElementById("machineNo");
  if (machineInput) {
    machineInput.addEventListener('input', updateTable);
  }
  fetchData();
});
