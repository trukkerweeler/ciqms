import { loadHeaderFooter, myport, getUserValue } from "./utils.mjs";

loadHeaderFooter();
const port = myport();
const user = await getUserValue();

const deviceUrl = `http://localhost:${port}/device`;
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
      createDialog.showModal();
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
          const requiredFields = [
            "DEVICE_ID",
            "NAME",
            "DEVICE_TYPE",
            "STATUS",
            "MAJOR_LOCATION",
          ];
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
          // uppercase the DEVICe_TYPE, STATUS, MAJOR_LOCATION, MINOR_LOCATION
          deviceData["DEVICE_ID"] = deviceData["DEVICE_ID"].toUpperCase();
          deviceData["DEVICE_TYPE"] = deviceData["DEVICE_TYPE"].toUpperCase();
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
        "Dialog element with id 'create-device-dialog' is missing or not a <dialog>."
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
            (device[field] ?? "").toString().toLowerCase().includes(filterValue)
          )
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
      let statusText = "";
      if (device[field] === "E") statusText = "EXPIRED";
      else if (device[field] === "C") statusText = "CURRENT";
      else if (device[field] === "X") statusText = "EXTEND";
      else if (device[field] === "D") statusText = "DISPOSED";
      else statusText = device[field] ?? "";
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
