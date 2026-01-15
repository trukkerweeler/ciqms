import { myport } from "./utils.mjs";

const port = myport() || 3003;

// ========== ITEM HISTORY DATA STRUCTURE ==========
let itemHistoryData = [];
let itemHistorySections = {
  MATERIAL: [],
  HEAT: [],
  PASS: [],
  SWELD: [],
  FWELD: [],
  CHEM: [],
  PAINT: [],
  OTHER: [],
};

// ========== DETERMINE SECTION FROM ITEM HISTORY RECORD ==========
/**
 * Determines which section a record belongs to based on its OPERATION or other fields
 * Maps to: Material, HEAT, PASS, SWELD, FWELD, CHEM, PAINT
 */
function determineRecordSection(record) {
  if (!record) return "OTHER";

  const operation = (record.OPERATION || "").toUpperCase().trim();
  const sequence = (record.SEQUENCE || "").toUpperCase().trim();
  const part = (record.PART || "").toUpperCase().trim();

  // Heat Treat operations
  if (
    operation.includes("HEAT") ||
    operation.includes("HEAT TREAT") ||
    sequence.includes("HEAT")
  ) {
    return "HEAT";
  }

  // Passivation operations
  if (
    operation.includes("PASSIV") ||
    sequence.includes("PASSIV") ||
    operation.includes("PASS")
  ) {
    return "PASS";
  }

  // Spot Welding operations
  if (
    operation.includes("SPOT") ||
    operation.includes("SPOT WELD") ||
    sequence.includes("SPOT")
  ) {
    return "SWELD";
  }

  // Fusion/MIG/TIG Welding operations
  if (
    operation.includes("FUSION") ||
    operation.includes("MIG") ||
    operation.includes("TIG") ||
    operation.includes("GMAW") ||
    operation.includes("WELD") ||
    sequence.includes("FWELD")
  ) {
    // Exclude spot welding
    if (!operation.includes("SPOT")) {
      return "FWELD";
    }
  }

  // Chemical treatment operations
  if (
    operation.includes("CHEM") ||
    operation.includes("CHEMICAL") ||
    operation.includes("PICKLE") ||
    operation.includes("PLATING") ||
    sequence.includes("CHEM")
  ) {
    return "CHEM";
  }

  // Paint operations
  if (
    operation.includes("PAINT") ||
    operation.includes("COAT") ||
    operation.includes("PRIMER") ||
    sequence.includes("PAINT")
  ) {
    return "PAINT";
  }

  // Material/Raw Material - default for initial items
  if (
    operation.includes("MATERIAL") ||
    operation.includes("RAW") ||
    sequence.includes("MATERIAL")
  ) {
    return "MATERIAL";
  }

  // If no specific operation, check if it's a raw material phase
  return "MATERIAL";
}

// ========== CATEGORIZE ITEM HISTORY ==========
/**
 * Takes flat array of item history records and organizes them by section
 * Records that match the job reference pattern are already included via recursion
 */
function categorizeItemHistory(records) {
  itemHistorySections = {
    MATERIAL: [],
    HEAT: [],
    PASS: [],
    SWELD: [],
    FWELD: [],
    CHEM: [],
    PAINT: [],
    OTHER: [],
  };

  if (!records || !Array.isArray(records)) {
    return itemHistorySections;
  }

  records.forEach((record) => {
    const section = determineRecordSection(record);
    itemHistorySections[section].push(record);
  });

  return itemHistorySections;
}

// ========== FETCH AND PROCESS ITEM HISTORY ==========
/**
 * Fetches the full recursive item history for a work order
 * Returns: Promise resolving to categorized data
 */
async function fetchItemHistory(woNumber) {
  try {
    console.log(`Fetching item history for WO: ${woNumber}`);

    const response = await fetch(
      `http://${
        window.location.hostname
      }:${port}/cert/item-history/${encodeURIComponent(woNumber)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch item history: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(
      `Retrieved ${data.length} total history records (with recursion)`
    );
    console.log("Item History Data:", data);

    // Store raw data
    itemHistoryData = data;

    // Categorize by section
    const categorized = categorizeItemHistory(data);

    // Log categorized results
    Object.entries(categorized).forEach(([section, records]) => {
      if (records.length > 0) {
        console.log(`${section}: ${records.length} records`);
      }
    });

    return {
      raw: itemHistoryData,
      categorized: itemHistorySections,
    };
  } catch (error) {
    console.error("Error fetching item history:", error);
    throw error;
  }
}

// ========== CONSOLE DISPLAY FUNCTIONS ==========
/**
 * Displays item history data nicely formatted in browser console
 * Call from browser console: displayItemHistory('000123')
 */
async function displayItemHistory(woNumber) {
  try {
    console.clear();
    console.log(
      "%c === ITEM HISTORY QUERY RESULTS ===",
      "color: #0066cc; font-size: 14px; font-weight: bold;"
    );
    console.log(
      `%cWork Order: ${woNumber}`,
      "color: #00aa00; font-weight: bold;"
    );
    console.log("");

    const result = await fetchItemHistory(woNumber);

    console.log(
      `%cTotal Records: ${result.raw.length}`,
      "color: #ff6600; font-weight: bold;"
    );
    console.log("");

    console.log(
      "%c--- RAW DATA (All Records) ---",
      "color: #0066cc; font-weight: bold;"
    );
    console.table(result.raw);
    console.log("Raw JSON:", result.raw);
    console.log("");

    console.log(
      "%c--- CATEGORIZED BY SECTION ---",
      "color: #0066cc; font-weight: bold;"
    );
    Object.entries(result.categorized).forEach(([section, records]) => {
      if (records.length > 0) {
        console.log(
          `%c${section} (${records.length} records)`,
          "color: #009900; font-weight: bold;"
        );
        console.table(records);
        console.log(`${section} JSON:`, records);
        console.log("");
      }
    });

    console.log("%c=== END RESULTS ===", "color: #0066cc; font-weight: bold;");

    return result;
  } catch (error) {
    console.error("Failed to display item history:", error);
  }
}

/**
 * Quick display - just logs the raw JSON array
 */
async function quickDisplayHistory(woNumber) {
  try {
    const result = await fetchItemHistory(woNumber);
    console.log("Item History JSON:", result.raw);
    return result.raw;
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Copy-paste ready display - logs JSON string for copying
 */
async function copyableHistory(woNumber) {
  try {
    const result = await fetchItemHistory(woNumber);
    const jsonString = JSON.stringify(result.raw, null, 2);
    console.log(jsonString);
    return jsonString;
  } catch (error) {
    console.error("Error:", error);
  }
}

// ========== PAGE TABLE DISPLAY ==========
/**
 * Displays item history in an HTML table on the page
 * Columns: PART, JOB, SUFFIX, SEQUENCE, SERIAL_NUMBER
 */
async function showItemHistoryTable(
  woNumber,
  containerId = "item-history-table"
) {
  try {
    const result = await fetchItemHistory(woNumber);
    const records = result.raw;

    // Create table HTML
    let tableHTML = `
      <div style="margin: 20px 0;">
        <h3>Item History for WO: ${woNumber}</h3>
        <p>Total Records: ${records.length}</p>
        <table border="1" cellpadding="10" cellspacing="0" style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
          <thead style="background-color: #4CAF50; color: white;">
            <tr>
              <th>PART</th>
              <th>JOB</th>
              <th>SUFFIX</th>
              <th>SEQUENCE</th>
              <th>SERIAL_NUMBER</th>
            </tr>
          </thead>
          <tbody>
    `;

    records.forEach((record) => {
      tableHTML += `
        <tr>
          <td>${record.PART || ""}</td>
          <td>${record.JOB || ""}</td>
          <td>${record.SUFFIX || ""}</td>
          <td>${record.SEQUENCE || ""}</td>
          <td>${record.SERIAL_NUMBER || ""}</td>
        </tr>
      `;
    });

    tableHTML += `
          </tbody>
        </table>
      </div>
    `;

    // Insert into page
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = tableHTML;
    } else {
      // Create a div if container doesn't exist
      const newDiv = document.createElement("div");
      newDiv.id = containerId;
      newDiv.innerHTML = tableHTML;
      document.body.appendChild(newDiv);
    }

    return result;
  } catch (error) {
    console.error("Error displaying table:", error);
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<p style="color: red;">Error loading data: ${error.message}</p>`;
    }
  }
}

// ========== MAKE AVAILABLE IN BROWSER CONSOLE ==========
// Use self-invoking function to expose to window immediately
(function () {
  // Attach to window object so it can be called directly from console
  window.displayItemHistory = displayItemHistory;
  window.quickDisplayHistory = quickDisplayHistory;
  window.copyableHistory = copyableHistory;
  window.fetchItemHistory = fetchItemHistory;
  window.showItemHistoryTable = showItemHistoryTable;
  window.itemHistoryData = itemHistoryData;
  window.itemHistorySections = itemHistorySections;
  window.categorizeItemHistory = categorizeItemHistory;
  window.determineRecordSection = determineRecordSection;

  console.log(
    "%c✓ Item History Functions Loaded",
    "color: #00aa00; font-weight: bold;"
  );
  console.log("Available commands:");
  console.log("  displayItemHistory(woNumber)");
  console.log("  quickDisplayHistory(woNumber)");
  console.log("  copyableHistory(woNumber)");
  console.log("  fetchItemHistory(woNumber)");
  console.log(
    "  showItemHistoryTable(woNumber, containerId='item-history-table')"
  );
})();

// ========== EXPORT FOR USE IN CERT PAGE ==========
export {
  fetchItemHistory,
  itemHistoryData,
  itemHistorySections,
  categorizeItemHistory,
  determineRecordSection,
  displayItemHistory,
  quickDisplayHistory,
  copyableHistory,
  showItemHistoryTable,
};

// ========== SEARCH RESULTS DISPLAY ==========
/**
 * Display search results in a simple table on the page
 */
function displaySearchResults(data, woNumber) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log("No data to display");
    return;
  }

  console.log("=== DISPLAY SEARCH RESULTS ===");
  console.log("Input data:", data);
  console.log("Number of records:", data.length);
  // DEV: data.forEach((r, i) => {
  //   let sn = r.SERIAL_NUMBER || "";
  //   if (sn.startsWith("PO: ")) {
  //     sn = sn.substring(4);
  //   }
  //   console.log(
  //     `[${i}] SERIAL_NUMBER: "${r.SERIAL_NUMBER}" => after trim: "${sn}"`
  //   );
  // });

  // Get the search results container and table body
  const resultsContainer = document.getElementById("searchResultsContainer");
  const resultsBody = document.getElementById("searchResultsBody");

  if (!resultsContainer || !resultsBody) {
    console.error("Search results container or table body not found");
    return;
  }

  // Clear previous results
  resultsBody.innerHTML = "";

  // Pattern to match ######-###
  const detailPattern = /^\d{6}-\d{3}$/;
  console.log("Looking for serial numbers matching pattern:", detailPattern);

  // First, deduplicate serial numbers that match the pattern
  const uniqueSerialNumbers = new Set();
  data.forEach((record) => {
    let serialNumber = (record.SERIAL_NUMBER || "").trim();
    if (serialNumber.startsWith("PO: ")) {
      serialNumber = serialNumber.substring(4).trim();
    }
    if (detailPattern.test(serialNumber)) {
      uniqueSerialNumbers.add(serialNumber);
    }
  });

  console.log(
    `Found ${uniqueSerialNumbers.size} unique serial numbers to fetch`
  );

  // DEV: Fetch detail data only for unique serial numbers
  // DEV: const detailFetches = Array.from(uniqueSerialNumbers).map((serialNumber) => {
  //   // DEV: console.log(`FETCHING DETAIL DATA for: ${serialNumber}`);
  //   return fetch(
  //     `http://${
  //       window.location.hostname
  //     }:${port}/cert/detail/${encodeURIComponent(serialNumber)}`,
  //     {
  //       method: "GET",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //     }
  //   )
  //     .then((response) => {
  //       if (response.ok) {
  //         return response.json();
  //       }
  //       return [];
  //     })
  //     .catch((error) => {
  //       console.error(`Error fetching detail data for ${serialNumber}:`, error);
  //       return [];
  //     });
  // });

  // DEV: Skip detail fetches - render original data only
  const detailFetches = [];

  // Wait for all detail fetches to complete
  Promise.all(detailFetches).then((allDetailData) => {
    // Combine original data with all fetched detail data
    let combinedData = [...data];

    console.log("Detail fetch results:", allDetailData);
    // DEV:
    // DEV: allDetailData.forEach((detailData, index) => {
    //   // DEV: console.log(
    //   //   `Detail data [${index}]:`,
    //   //   detailData,
    //   //   "is array?",
    //   //   Array.isArray(detailData)
    //   // );
    //   if (detailData && Array.isArray(detailData) && detailData.length > 0) {
    //     // DEV: console.log(
    //     //   `Appending ${detailData.length} records from detail fetch ${index}`
    //     // );
    //     combinedData = combinedData.concat(detailData);
    //   }
    // });

    allDetailData.forEach((detailData) => {
      if (detailData && Array.isArray(detailData) && detailData.length > 0) {
        combinedData = combinedData.concat(detailData);
      }
    });

    console.log(
      `Original records: ${data.length}, Combined records: ${combinedData.length}`
    );

    // Filter out records with SEQUENCE equals "999999" 
    const filteredData = combinedData.filter((record) => {
      const sequence = (record.SEQUENCE || "").trim();
      return sequence !== "999999";
    });

    console.log(
      `After filtering out SEQUENCE equals "999999": ${filteredData.length} records`
    );

    // Now render the filtered data
    filteredData.forEach((record) => {
      const row = document.createElement("tr");
      row.style.borderBottom = "1px solid #ddd";

      // Trim "PO: " prefix from SERIAL_NUMBER if present
      let serialNumber = record.SERIAL_NUMBER || "";
      if (serialNumber.startsWith("PO: ")) {
        serialNumber = serialNumber.substring(4);
      }

      row.innerHTML = `
        <td style="border: 1px solid #ddd; padding: 10px;">${
          record.PART || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${
          record.JOB || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${
          record.SUFFIX || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${
          record.SEQUENCE || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${serialNumber}</td>
      `;

      resultsBody.appendChild(row);
    });

    // Show the results container
    resultsContainer.style.display = "block";

    console.log(
      `Displayed ${combinedData.length} total records for WO: ${woNumber}`
    );
  });
}

// ========== DISPLAY DETAIL TABLE ==========
/**
 * Display detail data in a table on the page
 */
function displayDetailTable(data, serialNumber) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log("No detail data to display");
    alert(`No detail data found for serial number: ${serialNumber}`);
    return;
  }

  // Create or get detail container
  let detailContainer = document.getElementById("detailDataContainer");
  if (!detailContainer) {
    detailContainer = document.createElement("div");
    detailContainer.id = "detailDataContainer";
    detailContainer.style.marginTop = "30px";

    // Insert after search results
    const searchContainer = document.getElementById("searchResultsContainer");
    if (searchContainer && searchContainer.parentNode) {
      searchContainer.parentNode.insertBefore(
        detailContainer,
        searchContainer.nextSibling
      );
    } else {
      // Fallback: append to main
      const main = document.querySelector("main");
      if (main) {
        main.appendChild(detailContainer);
      } else {
        document.body.appendChild(detailContainer);
      }
    }
    console.log("Created new detail container");
  }

  // Create detail table HTML
  let detailHTML = `
    <h3>Detail Data for Serial Number: ${serialNumber}</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
      <thead style="background-color: #2196F3; color: white;">
        <tr>
          <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">PART</th>
          <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">JOB</th>
          <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">SUFFIX</th>
          <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">SEQUENCE</th>
          <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">SERIAL_NUMBER</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach((record) => {
    let displaySerialNumber = record.SERIAL_NUMBER || "";
    if (displaySerialNumber.startsWith("PO: ")) {
      displaySerialNumber = displaySerialNumber.substring(4);
    }

    detailHTML += `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="border: 1px solid #ddd; padding: 10px;">${
          record.PART || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${
          record.JOB || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${
          record.SUFFIX || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${
          record.SEQUENCE || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${displaySerialNumber}</td>
      </tr>
    `;
  });

  detailHTML += `
      </tbody>
    </table>
  `;

  detailContainer.innerHTML = detailHTML;

  // Scroll to the detail container
  detailContainer.scrollIntoView({ behavior: "smooth", block: "start" });

  console.log(
    `Displayed ${data.length} detail records for serial number: ${serialNumber}`
  );
}

// ========== SEARCH EVENT HANDLER ==========
document.addEventListener("DOMContentLoaded", () => {
  const btnSearch = document.getElementById("btnSearch");
  const woNo = document.getElementById("woNo");

  if (btnSearch) {
    btnSearch.addEventListener("click", async (event) => {
      event.preventDefault();

      const woNumber = woNo.value.trim();
      if (!woNumber) {
        console.error("Work Order No is empty");
        alert("Please enter a Work Order number");
        return;
      }

      try {
        // Show loading indicator
        const loadingIndicator = document.getElementById("loadingIndicator");
        if (loadingIndicator) {
          loadingIndicator.style.display = "block";
        }

        // Fetch item history
        const result = await fetchItemHistory(woNumber);

        // Hide loading indicator
        if (loadingIndicator) {
          loadingIndicator.style.display = "none";
        }

        // Display results in table
        displaySearchResults(result.raw, woNumber);
      } catch (error) {
        console.error("Error during search:", error);
        alert(`Error: ${error.message}`);

        // Hide loading indicator
        const loadingIndicator = document.getElementById("loadingIndicator");
        if (loadingIndicator) {
          loadingIndicator.style.display = "none";
        }
      }
    });
  }
});

// ========== MAKE AVAILABLE IN BROWSER CONSOLE ==========
// Attach to window object so it can be called directly from console
window.displayItemHistory = displayItemHistory;
window.quickDisplayHistory = quickDisplayHistory;
window.copyableHistory = copyableHistory;
window.fetchItemHistory = fetchItemHistory;
window.showItemHistoryTable = showItemHistoryTable;
window.displaySearchResults = displaySearchResults;
