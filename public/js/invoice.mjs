import { myport } from "./utils.mjs";

// Helper to group data by month-year and calculate monthly sums
function groupByMonthYear(data) {
  const groups = {};
  data.forEach(record => {
    // Find the first DATE_ field
    const dateKey = Object.keys(record).find(k => k.startsWith("DATE_"));
    let monthYear = "Unknown";
    if (dateKey && typeof record[dateKey] === "string" && /^\d{6}$/.test(record[dateKey])) {
      const mm = record[dateKey].slice(0, 2);
      const yy = record[dateKey].slice(4, 6);
      const yyyy = parseInt(yy, 10) < 50 ? "20" + yy : "19" + yy;
      monthYear = `${yyyy}-${mm}`;
    }
    if (!groups[monthYear]) groups[monthYear] = [];
    groups[monthYear].push(record);
  });
  return groups;
}

function getMonthlySum(records) {
  return records.reduce((sum, rec) => sum + (parseFloat(rec.AMT_INVOICE) || 0), 0);
}

const port  = myport() || 3003; // Get the port from utils.mjs
const url = `http://localhost:${port}/invoice`;

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
    console.error("Error fetching Invoice data:", error);
  }
}

// Render table based on filtered data
function renderTable(data) {
  let table = document.getElementById('global-table');
  if (table) table.remove();

  if (!data.length) return;

  table = document.createElement('table');
  table.id = 'global-table';
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
  // Group data by month-year
  const groups = groupByMonthYear(data);
  Object.entries(groups).forEach(([monthYear, records]) => {
    // Monthly summary row
    const summaryRow = document.createElement('tr');
    summaryRow.style.backgroundColor = "#f0f0f0";
    const summaryCell = document.createElement('td');
    summaryCell.colSpan = Object.keys(data[0]).length;
    summaryCell.textContent = `Month: ${monthYear} | Total: ${getMonthlySum(records).toFixed(2)}`;
    summaryRow.appendChild(summaryCell);
    tbody.appendChild(summaryRow);

    // Data rows for this month
    records.forEach(record => {
      const row = document.createElement('tr');
      Object.entries(record).forEach(([key, value]) => {
        const td = document.createElement('td');
        if (key.startsWith("DATE_") && typeof value === "string" && /^\d{6}$/.test(value)) {
          // Convert mmddyy to YYYY-mm-DD
          const mm = value.slice(0, 2);
          const dd = value.slice(2, 4);
          const yy = value.slice(4, 6);
          const yyyy = parseInt(yy, 10) < 50 ? "20" + yy : "19" + yy;
          td.textContent = `${yyyy}-${mm}-${dd}`;
        } else {
          td.textContent = value;
        }
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
  });
  table.appendChild(tbody);

  document.querySelector('main').appendChild(table);
}

// Filter and update table as user types
document.addEventListener('DOMContentLoaded', () => {
  const customerNoInput = document.getElementById("customerNo");
  if (customerNoInput) {
    customerNoInput.addEventListener('input', () => {
      const vendorNo = customerNoInput.value.trim().toLowerCase();
      const filtered = vendorNo
        ? allData.filter(record => String(record.VENDOR).toLowerCase().startsWith(vendorNo))
        : allData;
      renderTable(filtered);
    });
  }
  // Initial fetch
  fetchData();
});
