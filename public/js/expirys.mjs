import {
  loadHeaderFooter,
  createNotesSection,
  getUserValue,
  getDateTime,
  myport,
} from "./utils.mjs";
loadHeaderFooter();

const port = myport();
let user = await getUserValue();

const url = `http://localhost:${port}/expiry`;

// Function to handle EXPIRATION_ID link click
function handleExpirationIdClick(item) {
  return function (e) {
    e.preventDefault();
    document.getElementById("modalExpirationId").value = item.EXPIRATION_ID;
    const dispositionSelect = document.getElementById("modalDisposition");
    if (dispositionSelect) {
      Array.from(dispositionSelect.options).forEach((option) => {
        option.selected = option.value === item.DISPOSITION;
      });
    }
    document.getElementById("dispositionModal").showModal();
  };
}

const response = await fetch(url);
if (response.ok) {
  const data = await response.json();
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  // Get table headers from the first object, excluding CREATE_BY and CREATE_DATE
  const headers = Object.keys(data[0]).filter(
    (key) => key !== "CREATE_BY" && key !== "CREATE_DATE"
  );

  // Helper function to sort data
  function sortData(data, key, asc) {
    return [...data].sort((a, b) => {
      let valA = a[key];
      let valB = b[key];

      // Try to parse as date if key ends with DATE
      if (key.endsWith("DATE")) {
        valA = Date.parse(valA) || valA;
        valB = Date.parse(valB) || valB;
      }

      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });
  }

  // Create header row
  const headerRow = document.createElement("tr");
  let sortState = {}; // Track sort direction per column

  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      // Toggle sort direction
      sortState[header] = !sortState[header];
      const sortedData = sortData(data, header, sortState[header]);
      // Clear tbody
      tbody.innerHTML = "";
      // Re-render rows
      sortedData.forEach((item) => {
        const row = document.createElement("tr");
        headers.forEach((key) => {
          const td = document.createElement("td");
          if (
            key.endsWith("DATE") &&
            typeof item[key] === "string" &&
            item[key].includes("T")
          ) {
            td.textContent = item[key].split("T")[0];
          } else if (key === "EXPIRATION_ID") {
            const link = document.createElement("a");
            link.href = "#";
            link.textContent = item[key];
            link.addEventListener("click", handleExpirationIdClick(item));
            td.appendChild(link);
          } else {
            td.textContent = item[key];
          }
          row.appendChild(td);
        });
        tbody.appendChild(row);
      });
    });
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // Create data rows
  data.forEach((item) => {
    const row = document.createElement("tr");
    headers.forEach((key) => {
      const td = document.createElement("td");
      if (
        key.endsWith("DATE") &&
        typeof item[key] === "string" &&
        item[key].includes("T")
      ) {
        td.textContent = item[key].split("T")[0];
      } else if (key === "EXPIRATION_ID") {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = item[key];
        link.addEventListener("click", handleExpirationIdClick(item));
        td.appendChild(link);
      } else if (key === "COMMENT") {
        td.innerHTML = item[key] ? item[key].replace(/\n/g, "<br>") : "";
      } else {
        td.textContent = item[key];
      }
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);

  document.getElementById("main").appendChild(table);
}

// listen for saveExpiry and call url and save the form data
document.getElementById("saveExpiry").addEventListener("click", async () => {
  const formData = new FormData(document.getElementById("expiryForm"));
  const data = Object.fromEntries(formData.entries());
  const nextIdResponse = await fetch(`${url}/nextId`);
  const nextId = await nextIdResponse.json();
  data.EXPIRATION_ID = nextId;
  data.CREATE_BY = user;
  data.CREATE_DATE = getDateTime();
  console.log(nextId);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (response.ok) {
    alert("Expiry saved successfully!");
    // increment nextId for next entry
    const incrementResponse = await fetch(`${url}/incrementId`, {
      method: "PUT",
    });
    window.location.reload();
  } else {
    alert("Failed to save expiry.");
  }
});

// Save disposition and comment changes
document
  .getElementById("saveDisposition")
  .addEventListener("click", async () => {
    event.preventDefault();

    const expirationId = document.getElementById("modalExpirationId").value;
    const disposition = document.getElementById("modalDisposition").value;
    let comment = document.getElementById("modalComment").value.trim();

    let old_comment = "";
    try {
      const commentResponse = await fetch(`${url}/${expirationId}`);
      if (commentResponse.ok) {
        const item = await commentResponse.json();
        old_comment = item[0].COMMENT || "";
      }
    } catch (err) {
      console.error("Failed to fetch current comment:", err);
    }
    // Concatenate old_comment and comment unless either is zero length
    if (old_comment.length === 0) {
      comment = comment;
    } else if (comment.length === 0) {
      comment = old_comment;
    } else {
      comment = `${comment}\n${old_comment}`;
    }

    const response = await fetch(`${url}/${expirationId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ DISPOSITION: disposition, COMMENT: comment }),
    });

    if (response.ok) {
      document.getElementById("dispositionModal").close();
      window.location.reload();
    } else {
      alert("Failed to update disposition and comment.");
    }
  });
