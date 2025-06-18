import { myport } from "./utils.mjs";

const port  = myport() || 3003; // Get the port from utils.mjs
const url = `http://localhost:${port}/apoi`;

let allData = [];

// Fetch data once
async function fetchData() {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }

    allData = await response.json();
    renderTable(allData);
  } catch (error) {
    console.error("Error fetching RMA data:", error);
  }
}

// Render table based on filtered data
function renderTable(data) {
  let table = document.getElementById('apoi-table');
  if (table) table.remove();

  if (!data.length) return;

  table = document.createElement('table');
  table.id = 'apoi-table';
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

  document.querySelector('main').appendChild(table);
}

// Filter and update table as user types
document.addEventListener('DOMContentLoaded', () => {
  const vendorNoInput = document.getElementById("vendorNo");
  if (vendorNoInput) {
    vendorNoInput.addEventListener('input', () => {
      const vendorNo = vendorNoInput.value.trim().toLowerCase();
      const filtered = vendorNo
        ? allData.filter(record => String(record.VENDOR).toLowerCase().startsWith(vendorNo))
        : allData;
      renderTable(filtered);
    });
  }
  // Initial fetch
  fetchData();
});
