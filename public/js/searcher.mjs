import { myport, getApiUrl } from "./utils.mjs";

const apiUrl = await getApiUrl();

// Initialize when DOM is ready
function initializeSearcher() {
  const searchBtn = document.getElementById("btnSearch");
  if (!searchBtn) {
    console.warn("[searcher.mjs] Search button not found");
    return;
  }

  searchBtn.addEventListener("click", async (event) => {
    event.preventDefault(); // Prevent the default form submission
    // Clear previous results
    const table = document.getElementById("apoi-table");
    if (table) {
      table.remove(); // Remove the existing table if it exists
    }
    // Call the search function
    const searchValue = document.getElementById("searchValue").value.trim();
    if (!searchValue) {
      console.error("Search value is empty. Please enter a valid search term.");
      return;
    }
    // await fetchRMAData(searchValue);

    const url = `${apiUrl}/searcher/${encodeURIComponent(searchValue)}`;

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

      const data = await response.json();
      // console.log(data); // Handle the data as needed

      // Iterate through each record in the data array
      data.forEach((record) => {
        // Create table if it doesn't exist yet
        if (!window._apoiTable) {
          const table = document.createElement("table");
          table.id = "apoi-table";
          const thead = document.createElement("thead");
          const headerRow = document.createElement("tr");
          Object.keys(record).forEach((key) => {
            const th = document.createElement("th");
            th.textContent = key;
            headerRow.appendChild(th);
          });
          thead.appendChild(headerRow);
          table.appendChild(thead);
          const tbody = document.createElement("tbody");
          table.appendChild(tbody);
          document.querySelector("main").appendChild(table);
          window._apoiTable = table;
        }

        // Add a row for this record
        const tbody = window._apoiTable.querySelector("tbody");
        const row = document.createElement("tr");
        Object.entries(record).forEach(([key, value]) => {
          const td = document.createElement("td");
          td.textContent = value;
          row.appendChild(td);
        });
        tbody.appendChild(row);
      });
    } catch (error) {
      console.error("Error fetching RMA data:", error);
    }
  });
}

// Run initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSearcher);
} else {
  initializeSearcher();
}
