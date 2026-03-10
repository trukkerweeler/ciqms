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
      tableContainer.style.overflowX = "auto";
      tableContainer.className = "table-container";
      tableContainer.style.maxHeight = "calc(75vh - 60px)";
      tableContainer.style.overflowY = "auto";
      tableContainer.style.marginBottom = "2rem";

      // Create table with proper DOM structure for resizable columns
      const table = document.createElement("table");
      table.className = "table table-striped table-bordered table-hover";
      table.id = "deviceTable";
      table.style.marginBottom = "0";
      table.style.tableLayout = "fixed";

      // Create colgroup with saved widths
      const colgroup = document.createElement("colgroup");
      const savedWidths = getDeviceColumnWidths();
      myFields.forEach((field, index) => {
        const col = document.createElement("col");
        if (savedWidths && savedWidths[index]) {
          col.style.width = savedWidths[index];
        } else {
          col.style.width = "auto";
        }
        colgroup.appendChild(col);
      });
      table.appendChild(colgroup);

      // Create header
      const thead = document.createElement("thead");
      thead.style.position = "sticky";
      thead.style.top = "0";
      thead.style.zIndex = "1";
      thead.style.backgroundColor = "#f8f9fa";

      const headerRow = document.createElement("tr");
      myFields.forEach((field, index) => {
        const th = document.createElement("th");

        // Create wrapper for header text
        const headerText = document.createElement("span");
        headerText.textContent = field;
        headerText.style.cursor = "default";
        headerText.style.display = "inline-block";
        headerText.style.userSelect = "none";

        th.textContent = "";
        th.appendChild(headerText);
        th.dataset.columnIndex = index;
        headerRow.appendChild(th);
      });

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Create body
      const tbody = document.createElement("tbody");
      tbody.id = "deviceTableBody";

      data.forEach((device) => {
        const row = document.createElement("tr");
        myFields.forEach((field) => {
          const td = document.createElement("td");

          if (field === "DEVICE_ID") {
            const link = document.createElement("a");
            link.href = `device.html?id=${device[field]}`;
            link.textContent = device[field];
            td.appendChild(link);
          } else if (field === "STATUS") {
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
              if (statusCode === "E") statusText = "EXPIRED";
              else if (statusCode === "C") statusText = "CURRENT";
              else if (statusCode === "X") statusText = "EXTEND";
              else if (statusCode === "D") statusText = "DISPOSED";
              else statusText = statusCode ?? "";
            }
            td.textContent = statusText;
          } else if (field.endsWith("DATE")) {
            const dateValue = device[field];
            if (dateValue) {
              const date = new Date(dateValue);
              const options = {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              };
              const formattedDate = date.toLocaleDateString("en-US", options);
              td.textContent = formattedDate;

              if (
                field === "NEXT_DATE" &&
                new Date(dateValue) < new Date() &&
                device["MAJOR_LOCATION"] !== "LOCKUP"
              ) {
                row.classList.add("past-date");
              }
            }
          } else {
            td.textContent = device[field] ?? "";
          }

          row.appendChild(td);
        });
        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      tableContainer.appendChild(table);
      mainElement.appendChild(tableContainer);

      // Initialize resizable columns
      initializeDeviceColumnResizing(table);

      // Add filter functionality
      const filterInput = document.getElementById("deviceName");
      if (filterInput) {
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

          const tbody = document.getElementById("deviceTableBody");
          tbody.innerHTML = "";

          filteredData.forEach((device) => {
            const row = document.createElement("tr");
            myFields.forEach((field) => {
              const td = document.createElement("td");

              if (field === "DEVICE_ID") {
                const link = document.createElement("a");
                link.href = `device.html?id=${device[field]}`;
                link.textContent = device[field];
                td.appendChild(link);
              } else if (field === "STATUS") {
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
                  if (statusCode === "E") statusText = "EXPIRED";
                  else if (statusCode === "C") statusText = "CURRENT";
                  else if (statusCode === "X") statusText = "EXTEND";
                  else if (statusCode === "D") statusText = "DISPOSED";
                  else statusText = statusCode ?? "";
                }
                td.textContent = statusText;
              } else if (field.endsWith("DATE")) {
                const dateValue = device[field];
                if (dateValue) {
                  const date = new Date(dateValue);
                  const options = {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  };
                  const formattedDate = date.toLocaleDateString(
                    "en-US",
                    options,
                  );
                  td.textContent = formattedDate;

                  if (
                    field === "NEXT_DATE" &&
                    new Date(dateValue) < new Date() &&
                    device["MAJOR_LOCATION"] !== "LOCKUP"
                  ) {
                    row.classList.add("past-date");
                  }
                }
              } else {
                td.textContent = device[field] ?? "";
              }

              row.appendChild(td);
            });
            tbody.appendChild(row);
          });
        });
      }
    })
    .catch((error) => {
      console.error("Error fetching devices:", error);
    });
}

function getDeviceColumnWidths() {
  try {
    const widths = localStorage.getItem("device_column_widths");
    return widths ? JSON.parse(widths) : null;
  } catch (error) {
    console.error("Error retrieving column widths:", error);
    return null;
  }
}

function saveDeviceColumnWidths(widths) {
  try {
    localStorage.setItem("device_column_widths", JSON.stringify(widths));
  } catch (error) {
    console.error("Error saving column widths:", error);
  }
}

function initializeDeviceColumnResizing(table) {
  const headers = table.querySelectorAll("thead th");
  const colgroup = table.querySelector("colgroup");
  if (!colgroup) return;

  const cols = colgroup.querySelectorAll("col");

  headers.forEach((header, index) => {
    // Create resize handle
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "column-resize-handle";
    resizeHandle.style.position = "absolute";
    resizeHandle.style.right = "0";
    resizeHandle.style.top = "0";
    resizeHandle.style.height = "100%";
    resizeHandle.style.width = "4px";
    resizeHandle.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
    resizeHandle.style.borderRight = "1px solid #999";
    resizeHandle.style.cursor = "col-resize";
    resizeHandle.style.userSelect = "none";

    header.style.position = "relative";
    header.appendChild(resizeHandle);

    // Set up resize logic
    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const currentCol = cols[index];
      const currentWidth = currentCol.offsetWidth;

      const onMouseMove = (moveEvent) => {
        const diff = moveEvent.clientX - startX;
        const newWidth = Math.max(50, currentWidth + diff);
        currentCol.style.width = newWidth + "px";
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        resizeHandle.style.backgroundColor = "rgba(200, 200, 200, 0.5)";

        // Save the new widths to localStorage
        const widths = Array.from(cols).map((col) => col.style.width || "auto");
        saveDeviceColumnWidths(widths);
      };

      resizeHandle.style.backgroundColor = "rgba(100, 150, 255, 0.9)";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    // Show handle more prominently on hover
    resizeHandle.addEventListener("mouseenter", () => {
      resizeHandle.style.backgroundColor = "rgba(100, 150, 255, 0.9)";
      resizeHandle.style.borderRight = "1px solid #0066ff";
    });

    resizeHandle.addEventListener("mouseleave", () => {
      resizeHandle.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
      resizeHandle.style.borderRight = "1px solid #999";
    });
  });
}

getRecords();
