import { loadHeaderFooter, myport, getUserValue } from "./utils.mjs";
loadHeaderFooter();

const port = myport() || 3003;
const url = `http://localhost:${port}/requests`;

// Event listener for the "Add Change Request" button
const addRequestBtn = document.getElementById("addrequestlink");
if (addRequestBtn) {
  addRequestBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const dialog = document.getElementById("docRequestDialog");
    if (dialog) {
      dialog.showModal();

      // Close dialog on outside click
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) {
          dialog.close();
        }
      });

      // Handle ESC key
      dialog.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          dialog.close();
        }
      });
    }
  });
}

// Event listener for cancel button
const cancelBtn = document.getElementById("cancelRequestDialog");
if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    const dialog = document.getElementById("docRequestDialog");
    if (dialog) {
      dialog.close();
    }
  });
}

// Handle form submission
const docRequestForm = document.getElementById("docRequestForm");
if (docRequestForm) {
  docRequestForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(docRequestForm);
    const requestData = Object.fromEntries(formData.entries());

    // Validate required fields
    const requiredFields = [
      "DOCUMENT_ID",
      "CHANGE_TYPE",
      "REQUEST_TEXT",
      "CREATE_BY",
    ];
    for (const field of requiredFields) {
      if (!requestData[field] || requestData[field].trim() === "") {
        alert(`Please fill in the required field: ${field.replace(/_/g, " ")}`);
        return;
      }
    }

    try {
      // Get next REQUEST_ID
      const nextIdResponse = await fetch(`${url}/nextId`);
      if (!nextIdResponse.ok) {
        throw new Error("Failed to get next request ID");
      }
      const nextId = await nextIdResponse.json();

      // Add additional fields
      const user = await getUserValue();
      requestData["REQUEST_ID"] = nextId;
      requestData["CREATE_DATE"] = new Date().toISOString().split("T")[0];
      requestData["REQUEST_DATE"] = new Date().toISOString().split("T")[0];
      // Set default due date to 30 days from now
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      requestData["DUE_DATE"] = dueDate.toISOString().split("T")[0];

      const response = await fetch(`${url}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const dialog = document.getElementById("docRequestDialog");
        if (dialog) {
          dialog.close();
        }
        // Clear the form
        docRequestForm.reset();
        // Refresh the records
        getRecords();
      } else {
        console.error("Error creating request:", response.statusText);
        alert("Error creating request. Please try again.");
      }
    } catch (error) {
      console.error("Error creating request:", error);
      alert("Error creating request. Please try again.");
    }
  });
}

function getRecords() {
  const main = document.querySelector("main");
  // Clear existing content
  main.innerHTML = "";

  fetch(url, { method: "GET" })
    .then((response) => response.json())
    .then((records) => {
      // console.log(records);
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");
      const header = document.createElement("tr");
      const td = document.createElement("td");

      for (let key in records[0]) {
        // if (fieldList.includes(key)){
        const th = document.createElement("th");
        th.textContent = key;
        header.appendChild(th);
        // }
      }
      thead.appendChild(header);

      for (let record of records) {
        const tr = document.createElement("tr");
        for (let key in record) {
          const td = document.createElement("td");
          switch (key) {
            case "DUE_DATE":
              // if it's not null and not empty
              if (record[key] !== null && record[key] !== "") {
                td.textContent = record[key].slice(0, 10);
              } else {
                td.textContent = "";
              }
              break;
            case "CLOSED_DATE":
              if (record[key] !== null && record[key] !== "") {
                td.textContent = record[key].slice(0, 10);
              } else {
                td.textContent = "";
              }
              break;
            case "DECISION_DATE":
              if (record[key] !== null) {
                td.textContent = record[key].slice(0, 10);
              } else {
                td.textContent = "";
              }
              break;
            case "REQUEST_DATE":
              if (record[key] !== null) {
                td.textContent = record[key].slice(0, 10);
              } else {
                td.textContent = "";
              }
              break;
            case "REQUEST_ID":
              // add a link to the record
              td.innerHTML = `<a href="http://localhost:${port}/dcr.html?id=${record[key]}">${record[key]}</a>`;
              break;
            default:
              td.textContent = record[key];
            // tr.appendChild(td);
          }
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }

      table.appendChild(thead);
      table.appendChild(tbody);
      main.appendChild(table);
    });
}

getRecords();
