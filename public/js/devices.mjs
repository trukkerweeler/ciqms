import {
  loadHeaderFooter,
  myport,
  getSessionUser,
  getApiUrl,
} from "./utils.mjs";

loadHeaderFooter();
const user = await getSessionUser();
const apiUrl = await getApiUrl();

const deviceUrl = `${apiUrl}/device`;
console.log(`Device URL: ${deviceUrl}`);

let mainElement = document.getElementById("main");

// Event listener for the "Add Device" button
const addDeviceBtn = document.getElementById("btnAddDevice");
if (!addDeviceBtn) {
  console.error("Button with id 'btnAddDevice' not found.");
} else {
  addDeviceBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const createDialog = document.querySelector("[create-device-dialog]");
    if (createDialog) {
      // Set default values
      const purchaseDateField = document.getElementById("purchase-date");
      if (purchaseDateField && !purchaseDateField.value) {
        purchaseDateField.value = new Date().toISOString().slice(0, 10);
      }

      // Add input event listener to transform DEVICE_TYPE to uppercase as user types
      const deviceTypeField = document.getElementById("device-type");
      if (deviceTypeField) {
        deviceTypeField.addEventListener("input", (e) => {
          e.target.value = e.target.value.toUpperCase();
        });
      }

      createDialog.showModal();

      // Close dialog on outside click
      createDialog.addEventListener("click", (e) => {
        if (e.target === createDialog) {
          createDialog.close();
        }
      });

      // Handle ESC key
      createDialog.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          createDialog.close();
        }
      });

      const closeButton = createDialog.querySelector("#cancel-dialog");
      if (closeButton) {
        closeButton.addEventListener("click", () => {
          createDialog.close();
        });
      }
      const createButton = createDialog.querySelector("#create-device-button");
      if (createButton) {
        createButton.addEventListener("click", (e) => {
          e.preventDefault();
          const formData = new FormData(createDialog.querySelector("form"));
          const deviceData = Object.fromEntries(formData.entries());
          // Validate required fields
          const requiredFields = ["DEVICE_ID", "NAME", "MODEL"];
          for (const field of requiredFields) {
            if (!deviceData[field]) {
              alert(`Please fill in the required field: ${field}`);
              return;
            }
          }
          // Validate date fields
          const dateFields = ["NEXT_DATE"];
          for (const field of dateFields) {
            const dateValue = new Date(deviceData[field]);
            if (isNaN(dateValue.getTime())) {
              alert(`Please enter a valid date for: ${field}`);
              return;
            }
          }
          // uppercase the DEVICE_ID, STATUS, MAJOR_LOCATION, MINOR_LOCATION
          deviceData["DEVICE_ID"] = deviceData["DEVICE_ID"].toUpperCase();
          deviceData["STATUS"] = deviceData["STATUS"].toUpperCase();
          deviceData["MAJOR_LOCATION"] =
            deviceData["MAJOR_LOCATION"].toUpperCase();
          deviceData["MINOR_LOCATION"] =
            deviceData["MINOR_LOCATION"].toUpperCase();

          // Append deviceData
          deviceData["CREATE_BY"] = user;
          deviceData["CREATE_DATE"] = new Date().toISOString().split("T")[0];
          // console.log(deviceData);
          // Send the data to the server
          fetch(`${deviceUrl}/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(deviceData),
          })
            .then((response) => {
              if (response.ok) {
                createDialog.close();
                // clear the deviceTable
                const deviceTable = document.getElementById("deviceTable");
                if (deviceTable) {
                  deviceTable.remove();
                }
                // Show success message
                // alert("Device added successfully!");
                // Refresh the records
                getRecords(); // Refresh the records after adding a new device
              } else {
                console.error("Error adding device:", response.statusText);
              }
            })
            .catch((error) => {
              console.error("Error adding device:", error);
            });
        });
      }
    } else {
      console.error(
        "Dialog element with id 'create-device-dialog' is missing or not a <dialog>.",
      );
    }
    // clear the form fields
    const form = document.querySelector("form");
    if (form) {
      form.reset();
    } else {
      console.error("Form element is missing or not found.");
    }
  });
}

function getRecords() {
  fetch(deviceUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      // Handle case where no records are found
      if (!Array.isArray(data) || data.length === 0) {
        console.log("No device records found");
        let tableContainer = document.createElement("div");
        tableContainer.className = "table-container";
        tableContainer.innerHTML = `<p>No device records found</p>`;
        mainElement.appendChild(tableContainer);
        return;
      }

      let myFields = [
        "DEVICE_ID",
        "NAME",
        "DEVICE_TYPE",
        "STATUS",
        "MAJOR_LOCATION",
        "MINOR_LOCATION",
        "NEXT_DATE",
      ];

      let tableContainer = document.createElement("div");
      tableContainer.style.overflowX = "auto"; // Enable horizontal scrolling
      tableContainer.className = "table-container";
      tableContainer.style.maxHeight = "calc(75vh - 60px)"; // Adjusted for filter
      tableContainer.style.overflowY = "auto"; // Enable vertical scrolling
      tableContainer.style.marginBottom = "2rem";

      let deviceTableTemplate = `<table class="table table-striped table-bordered table-hover" id="deviceTable" style="margin-bottom: 0;">`;
      deviceTableTemplate += `<thead style="position: sticky; top: 0; background-color: #f8f9fa; z-index: 10;"><tr>`;
      for (const field of myFields) {
        deviceTableTemplate += `<th>${field}</th>`;
      }
      deviceTableTemplate += `</tr></thead>`;
      deviceTableTemplate += `<tbody id="deviceTableBody">`;
      for (const device of data) {
        deviceTableTemplate += generateTableRow(device, myFields);
      }
      deviceTableTemplate += `</tbody>`;
      deviceTableTemplate += `</table>`;

      tableContainer.innerHTML = deviceTableTemplate;
      mainElement.appendChild(tableContainer);

      // Add filter functionality
      const filterInput = document.getElementById("deviceName");
      const tableBody = document.getElementById("deviceTableBody");

      filterInput.addEventListener("input", () => {
        const filterValue = filterInput.value.toLowerCase();
        const filteredData = data.filter((device) =>
          myFields.some((field) =>
            (device[field] ?? "")
              .toString()
              .toLowerCase()
              .includes(filterValue),
          ),
        );

        tableBody.innerHTML = filteredData
          .map((device) => generateTableRow(device, myFields))
          .join("");
      });
    })
    .catch((error) => {
      console.error("Error fetching devices:", error);
    });
}

function generateTableRow(device, fields) {
  let rowTemplate = `<tr>`;
  for (const field of fields) {
    if (field === "DEVICE_ID") {
      rowTemplate += `<td><a href="device.html?id=${device[field]}">${device[field]}</a></td>`;
    } else if (field === "STATUS") {
      // Calculate status based on NEXT_DATE
      let statusText = "";
      let statusCode = device[field];

      if (device["NEXT_DATE"]) {
        const nextDate = new Date(device["NEXT_DATE"]);
        const now = new Date();

        if (device["MAJOR_LOCATION"] === "DISPOSED") {
          statusCode = "D";
          statusText = "DISPOSED";
        } else if (nextDate < now) {
          statusCode = "E";
          statusText = "EXPIRED";
        } else {
          statusCode = "C";
          statusText = "CURRENT";
        }
      } else {
        // Fallback if no NEXT_DATE
        if (statusCode === "E") statusText = "EXPIRED";
        else if (statusCode === "C") statusText = "CURRENT";
        else if (statusCode === "X") statusText = "EXTEND";
        else if (statusCode === "D") statusText = "DISPOSED";
        else statusText = statusCode ?? "";
      }
      rowTemplate += `<td>${statusText}</td>`;
    } else if (field.endsWith("DATE")) {
      const dateValue = device[field];
      if (dateValue) {
        const date = new Date(dateValue);
        const options = { year: "numeric", month: "2-digit", day: "2-digit" };
        const formattedDate = date.toLocaleDateString("en-US", options);
        if (
          field === "NEXT_DATE" &&
          new Date(dateValue) < new Date() &&
          device["MAJOR_LOCATION"] !== "LOCKUP"
        ) {
          rowTemplate = `<tr class="past-date">` + rowTemplate.slice(4); // Apply class to the entire row
          rowTemplate += `<td>${formattedDate}</td>`;
        } else {
          rowTemplate += `<td>${formattedDate}</td>`;
        }
      } else {
        rowTemplate += `<td></td>`;
      }
    } else {
      rowTemplate += `<td>${device[field] ?? ""}</td>`;
    }
  }
  rowTemplate += `</tr>`;
  return rowTemplate;
}

getRecords();
