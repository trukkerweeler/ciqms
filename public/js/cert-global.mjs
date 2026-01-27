import { myport } from "./utils.mjs";

const port = myport() || 3003;

// DOM elements
const btnSearch = document.getElementById("btnSearch");
const woNoInput = document.getElementById("woNo");
const loadingIndicator = document.getElementById("loadingIndicator");
const searchResultsContainer = document.getElementById(
  "searchResultsContainer",
);
const searchResultsBody = document.getElementById("searchResultsBody");
const itemHistoryBody = document.getElementById("itemHistoryBody");
const recursiveItemHistoryContainer = document.getElementById(
  "recursiveItemHistoryContainer",
);
const recursiveItemHistoryBody = document.getElementById(
  "recursiveItemHistoryBody",
);

// Add event listeners
btnSearch.addEventListener("click", handleSearch);
woNoInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSearch();
});

async function handleSearch() {
  const woNo = woNoInput.value.trim();

  if (!woNo) {
    alert("Please enter a Work Order number");
    return;
  }

  // Remove leading zeros
  const trimmedWo = woNo.replace(/^0+/, "");

  showLoading(true);

  try {
    // Fetch main certification data
    console.log(`Fetching: /cert-global/${trimmedWo}`);
    const certResponse = await fetch(
      `http://localhost:${port}/cert-global/${trimmedWo}`,
    );
    if (!certResponse.ok)
      throw new Error(
        `HTTP ${certResponse.status}: Failed to fetch certification data`,
      );

    const certData = await certResponse.json();
    console.log("Cert data:", certData);
    displayCertData(certData);

    // Fetch flat item history
    console.log(
      `Fetching item history: /cert-global/item-history/${trimmedWo}`,
    );
    const historyResponse = await fetch(
      `http://localhost:${port}/cert-global/item-history/${trimmedWo}`,
    );
    if (!historyResponse.ok)
      throw new Error(
        `HTTP ${historyResponse.status}: Failed to fetch item history`,
      );

    const historyData = await historyResponse.json();
    console.log("Flat item history:", historyData);
    displayItemHistory(historyData);

    // Find all distinct SERIAL_NUMBERs matching pattern ______-___
    const pattern = /^\d{6}-\d{3}$/;
    const serials = Array.from(
      new Set(
        historyData
          .map((item) => (item.SERIAL_NUMBER || "").trim())
          .filter((sn) => pattern.test(sn)),
      ),
    );
    console.log("Distinct child serial numbers:", serials);

    // For each, split into JOB and SUFFIX and call recursive endpoint
    let allRecursiveResults = [];
    for (const serial of serials) {
      const [job, suffix] = serial.split("-");
      if (!job || !suffix) continue;
      const recUrl = `http://localhost:${port}/cert-global/recursive-item-history/${job}/${suffix}`;
      console.log(`Fetching recursive item history for child: ${serial}`);
      const recResp = await fetch(recUrl);
      if (recResp.ok) {
        const recData = await recResp.json();
        allRecursiveResults = allRecursiveResults.concat(recData);
      }
    }
    if (allRecursiveResults.length > 0) {
      // Display recursive results in a separate table
      displayRecursiveItemHistory(allRecursiveResults);
    } else {
      // Hide the table if no results
      const container = document.getElementById(
        "recursiveItemHistoryContainer",
      );
      if (container) container.style.display = "none";
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    alert("Error: " + error.message);
  } finally {
    showLoading(false);
  }
}

function displayCertData(data) {
  searchResultsContainer.style.display = "block";
  const tbody = searchResultsBody;
  tbody.innerHTML = "";

  if (!data || Object.keys(data).length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">No data found</td></tr>';
    return;
  }

  const row = document.createElement("tr");
  row.innerHTML = `
    <td style="border: 1px solid #ddd; padding: 8px">${data.JOB || ""}</td>
    <td style="border: 1px solid #ddd; padding: 8px">${data.SUFFIX || ""}</td>
    <td style="border: 1px solid #ddd; padding: 8px">${data.CUSTOMER || ""}</td>
    <td style="border: 1px solid #ddd; padding: 8px">${data.NAME_CUSTOMER || ""}</td>
    <td style="border: 1px solid #ddd; padding: 8px">${data.DATE_REQUIRED || ""}</td>
    <td style="border: 1px solid #ddd; padding: 8px">${data.DATE_COMPLETE || ""}</td>
  `;
  tbody.appendChild(row);
}

function displayItemHistory(items) {
  const container = document.getElementById("itemHistoryContainer");
  if (container) container.style.display = "block";
  const tbody = itemHistoryBody;
  tbody.innerHTML = "";

  if (!Array.isArray(items) || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10">No item history found</td></tr>';
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="border: 1px solid #ddd; padding: 8px">${item.SEQUENCE || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.PART || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.JOB || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.SUFFIX || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.SERIAL_NUMBER || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.REFERENCE || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.QUANTITY || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.PURCHASE_ORDER || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.PO_LINE || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.DESCRIPTION || ""}</td>
    `;
    tbody.appendChild(row);
  });
}

function displayRecursiveItemHistory(items) {
  const container = document.getElementById("recursiveItemHistoryContainer");
  if (container) container.style.display = "block";
  const tbody = document.getElementById("recursiveItemHistoryBody");
  if (!container || !tbody) return;
  tbody.innerHTML = "";
  // Exclude PARTs that begin with 'SWC'
  const filteredItems = Array.isArray(items)
    ? items.filter((item) => !(item.PART && item.PART.startsWith("SWC")))
    : [];

  // Build a map of SERIAL_NUMBER to item for parent lookup
  const serialMap = {};
  filteredItems.forEach((item) => {
    if (item.SERIAL_NUMBER) serialMap[item.SERIAL_NUMBER] = item;
  });

  // Attempt to infer parent-child relationship using REFERENCE as parent
  filteredItems.forEach((item) => {
    const parentSerial = item.REFERENCE || "";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="border: 1px solid #ddd; padding: 8px">${item.SEQUENCE || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.PART || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.JOB || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.SUFFIX || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.SERIAL_NUMBER || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.REFERENCE || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${parentSerial}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.QUANTITY || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.PURCHASE_ORDER || ""}</td>
      <td style="border: 1px solid #ddd; padding: 8px">${item.PO_LINE || ""}</td>
    `;
    tbody.appendChild(row);
  });
  container.style.display = "block";
}

function showLoading(isLoading) {
  loadingIndicator.style.display = isLoading ? "block" : "none";
}

// Remove auto-search on page load
// document.addEventListener("DOMContentLoaded", () => {
//   if (woNoInput.value) {
//     handleSearch();
//   }
// });
