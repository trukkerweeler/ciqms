import { loadHeaderFooter, myport, getUserValue } from "./utils.mjs";

loadHeaderFooter();
const port = myport();
const user = await getUserValue();

const deviceUrl = `http://localhost:${port}/device`;
let mainElement = document.getElementById("main-content");

// Make the page header div
function makePageHeaderDiv() {
  const divTitle = document.createElement("div");
  divTitle.classList.add("page-header-div");
  const pageTitle = document.createElement("h1");
  pageTitle.classList.add("page-header");
  pageTitle.innerHTML = "Devices List";
  divTitle.appendChild(pageTitle);
  // Add the button to the header div
  let addDeviceBtn = document.createElement("button");
  addDeviceBtn.type = "submit";
  addDeviceBtn.classList.add("btn", "btn-plus");
  addDeviceBtn.id = "btnAddDevice";
  addDeviceBtn.textContent = "+ Add Device";
  addDeviceBtn.setAttribute("title", "Click to add a new device");
  divTitle.appendChild(addDeviceBtn);
  // append the header div to the main element
  mainElement.appendChild(divTitle);
}
makePageHeaderDiv();


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
            deviceData["MAJOR_LOCATION"] = deviceData["MAJOR_LOCATION"].toUpperCase();
            deviceData["MINOR_LOCATION"] = deviceData["MINOR_LOCATION"].toUpperCase();

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
                // delete the filterContainer
                const filterContainer = document.getElementById("filterContainer");
                if (filterContainer) {
                  filterContainer.remove();
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

      // Create filter input
      let filterContainer = document.createElement("div");
      filterContainer.setAttribute("id", "filterContainer");
      filterContainer.innerHTML = `
                <input type="text" id="filterInput" placeholder="Filter devices..." class="form-control mb-3">
            `;
      mainElement.appendChild(filterContainer);

      let tableContainer = document.createElement("div");
      tableContainer.style.overflowX = "auto"; // Enable horizontal scrolling
      tableContainer.style.maxHeight = "500px"; // Set a max height for vertical scrolling
      tableContainer.style.overflowY = "auto"; // Enable vertical scrolling
      tableContainer.classList.add("table-container");

      let deviceTableTemplate = `<table class="table table-striped table-bordered table-hover" id="deviceTable">`;
      deviceTableTemplate += `<thead><tr>`;
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
      const filterInput = document.getElementById("filterInput");
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
    } else if (field.endsWith("DATE")) {
      const dateValue = device[field];
      if (dateValue) {
        const date = new Date(dateValue);
        const options = { year: "numeric", month: "2-digit", day: "2-digit" };
        const formattedDate = date.toLocaleDateString("en-US", options);
        if (field === "NEXT_DATE" && new Date(dateValue) < new Date()) {
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


