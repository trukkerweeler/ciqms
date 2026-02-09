import { getApiUrl } from "./utils.mjs";

const port = null; // no longer used
let url = "";

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
  let table = document.getElementById("apoi-table");
  if (table) table.remove();

  if (!data.length) return;

  table = document.createElement("table");
  table.id = "apoi-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  Object.keys(data[0]).forEach((key) => {
    const th = document.createElement("th");
    th.className = "smaller-font";
    th.textContent = key;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  data.forEach((record) => {
    const row = document.createElement("tr");
    Object.entries(record).forEach(([key, value]) => {
      const td = document.createElement("td");
      td.className = "smaller-font";
      if (
        key.startsWith("DATE_") &&
        typeof value === "string" &&
        /^\d{6}$/.test(value)
      ) {
        // Convert mmddyy to YYYY-mm-DD
        const mm = value.slice(0, 2);
        const dd = value.slice(2, 4);
        const yy = value.slice(4, 6);
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

  document.querySelector("main").appendChild(table);
}

// Filter and update table as user types
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize URL
  const apiUrl = await getApiUrl();
  url = `${apiUrl}/apoi`;
  const vendorNoInput = document.getElementById("vendorNo");
  if (vendorNoInput) {
    vendorNoInput.addEventListener("input", () => {
      const vendorNo = vendorNoInput.value.trim().toLowerCase();
      const filtered = vendorNo
        ? allData.filter((record) =>
            String(record.VENDOR).toLowerCase().startsWith(vendorNo),
          )
        : allData;
      renderTable(filtered);
    });
  }
  // Initial fetch
  fetchData();
});
