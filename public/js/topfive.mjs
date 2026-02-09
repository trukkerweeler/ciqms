import { loadHeaderFooter, myport, getApiUrl } from "./utils.mjs";

// Initialize header/footer
loadHeaderFooter();

const apiUrl = await getApiUrl();
const url = `${apiUrl}/topfive`;

/**
 * Fetch top 5 customers data from the server
 */
async function fetchTopFiveData() {
  try {
    console.log("[topfive.mjs] Fetching from:", url);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }

    const data = await response.json();
    console.log("[topfive.mjs] Received data:", data);
    console.log("[topfive.mjs] Data length:", data?.length);

    // Check if we got an error object instead of array
    if (data && data.error) {
      console.error("[topfive.mjs] Server error:", data.error);
      document.getElementById("topfiveContainer").innerHTML =
        `<p class="error">Server error: ${data.error}</p>`;
      return;
    }

    renderTable(data);
  } catch (error) {
    console.error("Error fetching top 5 customers data:", error);
    document.getElementById("topfiveContainer").innerHTML =
      '<p class="error">Failed to load data. Please try again.</p>';
  }
}

/**
 * Render table with top 5 customers data
 */
function renderTable(data) {
  console.log("[topfive.mjs] renderTable called with:", data);
  const container = document.getElementById("topfiveContainer");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    console.warn("[topfive.mjs] No data available");
    container.innerHTML = "<p>No customer data available.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "data-table";

  // Create header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const headers = ["Rank", "Customer", "Invoice Count", "Total Amount"];
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement("tbody");
  data.forEach((item, index) => {
    const row = document.createElement("tr");

    // Rank
    const rankCell = document.createElement("td");
    rankCell.textContent = index + 1;
    row.appendChild(rankCell);

    // Customer ID
    const customerCell = document.createElement("td");
    customerCell.textContent = item.CUSTOMER || "N/A";
    row.appendChild(customerCell);

    // Invoice Count
    const countCell = document.createElement("td");
    countCell.textContent = item.INVOICE_COUNT || "0";
    countCell.style.textAlign = "right";
    row.appendChild(countCell);

    // Total Amount
    const amountCell = document.createElement("td");
    const amount = parseFloat(item.TOTAL_AMOUNT) || 0;
    amountCell.textContent = `$${amount.toFixed(2)}`;
    amountCell.style.textAlign = "right";
    row.appendChild(amountCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  const tableWrapper = document.createElement("div");
  tableWrapper.className = "table-container scrollable-table";
  tableWrapper.appendChild(table);
  container.appendChild(tableWrapper);
}

// Load data on page load
document.addEventListener("DOMContentLoaded", () => {
  fetchTopFiveData();
});
