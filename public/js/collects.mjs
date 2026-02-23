import { loadHeaderFooter, getApiUrl, getSessionUser } from "./utils.mjs";

loadHeaderFooter();

let collectUrl = "";
let idsUrl = "";

// Helper function to format ID with zero-padding to 7 digits
function formatIdForDisplay(id) {
  if (id === null || id === undefined) return "";
  return String(id).padStart(7, "0");
}

// Wait for DOM and fetch API URL before anything else
document.addEventListener("DOMContentLoaded", async () => {
  const apiUrl = await getApiUrl();
  collectUrl = `${apiUrl}/collect/prod-plan-data`;
  idsUrl = `${apiUrl}/ids`;

  const user = await getSessionUser();
  const prodPlanContainer = document.getElementById("prod-plan-container");
  const columnControls = document.getElementById("column-controls");
  const createProductPlanDialog = document.querySelector(
    "[create-product-plan-dialog]",
  );

  // read the id from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  const createPlanHeader = document.querySelector("#create-plan-header");
  if (createPlanHeader) {
    if (id) {
      createPlanHeader.innerHTML = "Create Collect for Product: " + id;
    } else {
      createPlanHeader.innerHTML = "Create Collect";
    }
  }

  // Create and add the Add Collect button to column controls
  if (columnControls) {
    const addCollBtn = document.createElement("button");
    addCollBtn.type = "submit";
    addCollBtn.classList.add("btn", "btn-plus");
    addCollBtn.id = "btnAddColl";
    addCollBtn.textContent = "+ Add Collect";
    addCollBtn.setAttribute("title", "Click to add a new collect");

    addCollBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const productIdField = document.getElementById("product-id");
      const collectionDateField = document.getElementById("collection-date");
      const dueDateField = document.getElementById("due-date");

      // If we have a product ID from the URL, pre-populate the field
      if (id && productIdField) {
        productIdField.value = id;
      }

      // Set Collection Date to today
      if (collectionDateField) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        collectionDateField.value = `${yyyy}-${mm}-${dd}`;
      }

      // Set Due Date to tomorrow (today + 1 day)
      if (dueDateField) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const dd = String(tomorrow.getDate()).padStart(2, "0");
        dueDateField.value = `${yyyy}-${mm}-${dd}`;
      }

      if (createProductPlanDialog) {
        createProductPlanDialog.showModal();
      }
    });

    columnControls.appendChild(addCollBtn);
  }

  function displayNewRecord(record) {
    // Get the existing table or create a new one if needed
    const existingTable = prodPlanContainer.querySelector("table");

    if (!existingTable) {
      // No table exists yet, just refresh
      return;
    }

    // Get the tbody of existing table
    const tbody = existingTable.querySelector("tbody");
    if (!tbody) {
      return;
    }

    // Get the headers from existing table to determine which fields to display
    const headers = existingTable.querySelectorAll("thead th");
    const fields = Array.from(headers).map((th) => {
      const text = th.textContent.toUpperCase();
      // Map display names back to field names
      if (text === "COLLECTION DATE") return "COLLECTION_DATE";
      if (text === "DUE DATE") return "DUE_DATE";
      if (text === "PRODUCT REV LEVEL") return "PRODUCT_REV_LEVEL";
      if (text === "OPERATION NO") return "OPERATION_NO";
      if (text === "PO NUMBER") return "PO_NUMBER";
      if (text === "LOT NUMBER") return "LOT_NUMBER";
      if (text === "LOT SIZE") return "LOT_SIZE";
      if (text === "ASSIGNED TO") return "ASSIGNED_TO";
      return text.replace(/ /g, "_");
    });

    // Create a new row
    const row = document.createElement("tr");
    fields.forEach((field) => {
      const td = document.createElement("td");
      const val = record[field];

      if (val === null || val === undefined) {
        td.textContent = "";
      } else if (field === "PRODUCT_COLLECT_ID") {
        // Format ID with zero-padding
        td.textContent = formatIdForDisplay(val);
      } else if (field.toLowerCase().endsWith("date") && record[field]) {
        const date = new Date(record[field]);
        if (!isNaN(date)) {
          td.textContent = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
        } else {
          td.textContent = String(val);
        }
      } else {
        td.textContent = String(val || "");
      }
      row.appendChild(td);
    });

    // Insert at the top of tbody (most recent first)
    tbody.insertBefore(row, tbody.firstChild);
  }

  function getRecords() {
    // Clear only the table container
    if (prodPlanContainer) {
      prodPlanContainer.innerHTML = "";
    }

    // Determine the URL to fetch from based on whether we have an id
    const fetchUrl = id ? `${collectUrl}/${id}` : collectUrl;

    fetch(fetchUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        // Validate that data is an array
        if (!Array.isArray(data)) {
          console.error("Expected array from API, got:", typeof data, data);
          data = [];
        }

        const displayData = data;

        // Build field list from returned data, excluding user-defined and reference fields
        let myFields = [];
        if (displayData.length > 0) {
          myFields = Object.keys(displayData[0]).filter((k) => {
            return (
              !/USER_DEFINED/i.test(k) &&
              !/^REFERENCE/i.test(k) &&
              !/^CREATE_BY$/i.test(k) &&
              !/^ENTITY_ID$/i.test(k)
            );
          });
        } else {
          // sensible defaults when there are no records yet
          myFields = [
            "PRODUCT_COLLECT_ID",
            "PRODUCT_ID",
            "PRODUCT_REV_LEVEL",
            "OPERATION_NO",
            "COLLECTION_DATE",
            "PO_NUMBER",
            "LOT_NUMBER",
            "LOT_SIZE",
            "ASSIGNED_TO",
            "DUE_DATE",
            "CREATE_DATE",
          ];
        }

        // Check if there are no records
        if (displayData.length === 0) {
          const noRecordsDiv = document.createElement("div");
          noRecordsDiv.style.textAlign = "center";
          noRecordsDiv.style.padding = "40px 20px";
          noRecordsDiv.style.fontSize = "16px";
          noRecordsDiv.style.color = "#666";
          noRecordsDiv.textContent = "No collection records found";
          prodPlanContainer.appendChild(noRecordsDiv);
          return;
        }

        // Create a scrollable container for the table
        let tableContainer = document.createElement("div");
        tableContainer.className = "table-container";
        // Calculate height to account for footer (footer height ~50px + some padding)
        tableContainer.style.maxHeight = "calc(80vh - 60px)"; // Increased height due to compact header
        tableContainer.style.overflowY = "auto"; // Enable vertical scrolling
        tableContainer.style.overflowX = "auto"; // Enable horizontal scrolling if needed
        tableContainer.style.border = "1px solid #ddd"; // Add border for better visual separation
        tableContainer.style.borderRadius = "4px"; // Add rounded corners
        tableContainer.style.marginTop = "10px"; // Add some top margin
        tableContainer.style.marginBottom = "80px"; // Add bottom margin to clear footer

        let table = document.createElement("table");
        table.className = "table table-striped table-bordered table-hover";
        table.style.marginBottom = "0"; // Remove default table margin

        // Create table header
        let thead = document.createElement("thead");
        thead.style.position = "sticky"; // Make header sticky
        thead.style.top = "0"; // Stick to top of container
        thead.style.backgroundColor = "#f8f9fa"; // Light background for header
        thead.style.zIndex = "10"; // Ensure header stays on top

        let headerRow = document.createElement("tr");
        myFields.forEach((field) => {
          let th = document.createElement("th");
          if (field === "COLLECTION_DATE") {
            th.textContent = "COLLECTION DATE";
          } else if (field === "DUE_DATE") {
            th.textContent = "DUE DATE";
          } else {
            th.textContent = field.replace(/_/g, " ");
          }
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        let tbody = document.createElement("tbody");
        displayData.forEach((record) => {
          let row = document.createElement("tr");
          myFields.forEach((field) => {
            let td = document.createElement("td");
            const val = record[field];
            if (val === null || val === undefined) {
              td.textContent = "";
            } else if (
              typeof val === "string" &&
              (val === "I" || val === "P")
            ) {
              td.textContent = val === "I" ? "Internal" : "Passed";
            } else if (
              field === "PRODUCT_COLLECT_ID" ||
              field === "PRD_INSP_PLN_SYSID"
            ) {
              // Format ID fields with zero-padding to 7 digits
              td.textContent = formatIdForDisplay(val);
            } else if (field.toLowerCase().endsWith("date") && record[field]) {
              const date = new Date(record[field]);
              if (!isNaN(date)) {
                td.textContent = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
              } else {
                td.textContent = String(val);
              }
            } else {
              td.textContent = String(val || "");
            }
            row.appendChild(td);
          });
          tbody.appendChild(row);
        });
        table.appendChild(tbody);

        // Append the table to the container, then container to the prod plan element
        tableContainer.appendChild(table);
        prodPlanContainer.appendChild(tableContainer);
      })
      .catch((error) => {
        console.error("Error fetching records:", error);
        const errorDiv = document.createElement("div");
        errorDiv.style.textAlign = "center";
        errorDiv.style.padding = "40px 20px";
        errorDiv.style.fontSize = "16px";
        errorDiv.style.color = "#d00";
        errorDiv.innerHTML = `<strong>Error loading records:</strong><br>
        ${error.message}<br>
        <small style="color: #999;">Check browser console for details</small>`;
        prodPlanContainer.appendChild(errorDiv);
      });
  }

  // Listen for the cancel button
  const cancelAddProductPlan = document.getElementById(
    "cancel-add-product-plan",
  );
  if (cancelAddProductPlan) {
    cancelAddProductPlan.addEventListener("click", (e) => {
      e.preventDefault();
      if (createProductPlanDialog) {
        createProductPlanDialog.close();
      }
    });
  }

  let nextId;
  const submitFormAddProductPlan = document.querySelector(
    "#buttonAddProductPlan",
  );
  if (submitFormAddProductPlan) {
    submitFormAddProductPlan.addEventListener("click", async (e) => {
      e.preventDefault();

      const myForm = document.querySelector("#create-product-plan-form");
      if (!myForm) {
        console.error("Form with id 'create-product-plan-form' not found.");
        return;
      }
      const formData = new FormData(myForm);
      const data = Object.fromEntries(formData.entries());

      // Validate required fields
      if (!data.PRODUCT_ID || !data.PRODUCT_REV_LEVEL || !data.OPERATION_NO) {
        alert("Product ID, Product Rev Level, and Operation No are required.");
        return;
      }

      // Check if PRODUCT_INSP_PLAN exists with matching PRODUCT_ID, PRODUCT_REV_LEVEL, and OPERATION_NO
      try {
        const inspPlanResponse = await fetch(
          `${apiUrl}/collect/insp-plan/${data.PRODUCT_ID}/${data.PRODUCT_REV_LEVEL}/${data.OPERATION_NO}`,
        );

        if (!inspPlanResponse.ok) {
          const proceedAnyway = confirm(
            `No matching Inspection Plan found for:\n\nProduct ID: ${data.PRODUCT_ID}\nProduct Rev Level: ${data.PRODUCT_REV_LEVEL}\nOperation No: ${data.OPERATION_NO}\n\nDo you want to save anyway?`,
          );
          if (!proceedAnyway) {
            return;
          }
        } else {
          const inspPlanData = await inspPlanResponse.json();
          if (!inspPlanData || inspPlanData.length === 0) {
            const proceedAnyway = confirm(
              `No matching Inspection Plan found for:\n\nProduct ID: ${data.PRODUCT_ID}\nProduct Rev Level: ${data.PRODUCT_REV_LEVEL}\nOperation No: ${data.OPERATION_NO}\n\nDo you want to save anyway?`,
            );
            if (!proceedAnyway) {
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error checking for inspection plan:", error);
        const proceedAnyway = confirm(
          `Error validating inspection plan. Do you want to save anyway?`,
        );
        if (!proceedAnyway) {
          return;
        }
      }

      // Get next ID
      try {
        nextId = await fetch(idsUrl, { method: "GET" }).then((res) =>
          res.json(),
        );
      } catch (error) {
        console.error("Error fetching next ID:", error);
        alert("Error getting record ID.");
        return;
      }

      data["PRODUCT_COLLECT_ID"] = parseInt(nextId, 10); // Ensure it's an integer
      data["CREATE_BY"] = user;
      const now = new Date();
      const mysqlDate = now.toISOString().slice(0, 19).replace("T", " ");
      data["CREATE_DATE"] = mysqlDate;

      // Uppercase fields
      if (data["PRODUCT_ID"]) {
        data["PRODUCT_ID"] = data["PRODUCT_ID"].toUpperCase();
      }
      if (data["PRODUCT_REV_LEVEL"]) {
        data["PRODUCT_REV_LEVEL"] = data["PRODUCT_REV_LEVEL"].toUpperCase();
      }
      if (data["LOT_NUMBER"]) {
        data["LOT_NUMBER"] = data["LOT_NUMBER"].toUpperCase();
      }
      if (data["OPERATION_NO"]) {
        data["OPERATION_NO"] = data["OPERATION_NO"].toUpperCase();
      }

      // Ensure numeric fields are integers
      if (data["LOT_SIZE"]) {
        data["LOT_SIZE"] = parseInt(data["LOT_SIZE"], 10);
      }
      if (data["ACCEPTED"]) {
        data["ACCEPTED"] = parseInt(data["ACCEPTED"], 10);
      }
      if (data["REJECTED"]) {
        data["REJECTED"] = parseInt(data["REJECTED"], 10);
      }

      // Send the data to the server
      fetch(collectUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
        .then((response) => response.json())
        .then((result) => {
          if (result.success && result.record) {
            // Close the dialog
            if (createProductPlanDialog) {
              createProductPlanDialog.close();
            }

            // Clear the form for next entry
            myForm.reset();

            // Immediately add the new record to the table display
            displayNewRecord(result.record);

            // Refresh all records from server
            getRecords();

            // Update the next ID
            fetch(idsUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ nextId: nextId }),
            }).then((response) => {
              if (!response.ok) {
                console.error("Error updating next ID:", response.statusText);
              }
            });
          } else {
            console.error("Error creating record:", result);
            alert("Error saving record. Please try again.");
          }
        })
        .catch((error) => {
          console.error("Error creating record:", error);
          alert("Error saving record: " + error.message);
        });
    });
  }

  // Load records when page loads
  getRecords();
});
