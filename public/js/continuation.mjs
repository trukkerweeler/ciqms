import { myport } from "./utils.mjs";

const port  = myport() || 3003; // Get the port from utils.mjs
const url = `http://localhost:${port}/continuation`;

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
    console.error("Error fetching Continuation data:", error);
  }
}

// Render table based on filtered data
function renderTable(data) {
  let table = document.getElementById('continuation-table');
  if (table) table.remove();

  if (!data.length) return;

  table = document.createElement('table');
  table.id = 'continuation-table';
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  Object.keys(data[0]).forEach(key => {
    const th = document.createElement('th');
    th.className = "smaller-font";
    th.textContent = key;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach(record => {
    const row = document.createElement('tr');
    Object.entries(record).forEach(([key, value]) => {
      const td = document.createElement('td');
      td.className = "smaller-font";
      if (key.startsWith("DATE_") && typeof value === "string" && /^\d{6}$/.test(value)) {
      // Convert mmddyy to YYYY-mm-DD
      const yy = value.slice(0, 2);
      const mm = value.slice(2, 4);
      const dd = value.slice(4, 6);
      const year = Number(yy) < 50 ? "20" + yy : "19" + yy; // Y2K-safe
      td.textContent = `${year}-${mm}-${dd}`;
      } else {
      td.textContent = value;
      }
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  document.querySelector('main').appendChild(table);
}

// Filter and update table as user types
document.addEventListener('DOMContentLoaded', () => {
  const employeeInput = document.getElementById("employee");
  if (employeeInput) {
    employeeInput.addEventListener('input', () => {
      const employee = employeeInput.value.trim().toLowerCase();
      const filtered = employee
        ? allData.filter(record => String(record.EMPLOYEE).toLowerCase().startsWith(employee))
        : allData;
      renderTable(filtered);
    });
  }
  // Initial fetch
  fetchData();
});
