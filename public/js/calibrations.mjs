import { loadHeaderFooter, getApiUrl, getSessionUser } from "./utils.mjs";

loadHeaderFooter();

let calibrationUrl = "";
let idsUrl = "";
let deviceUrl = "";

// Wait for DOM and fetch API URL before anything else
document.addEventListener("DOMContentLoaded", async () => {
  const apiUrl = await getApiUrl();
  calibrationUrl = `${apiUrl}/calibrate`;
  idsUrl = `${apiUrl}/ids`;
  deviceUrl = `${apiUrl}/device/nextdue`;

  const user = await getSessionUser();
  const mainElement = document.getElementById("main-content");

  // Constrain main element height to prevent overflow
  mainElement.style.maxHeight = "calc(100vh - 250px)";
  mainElement.style.overflowY = "auto";

  // read the id from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  const createCalHeader = document.querySelector("#create-cal-header");
  if (createCalHeader) {
    if (id) {
      createCalHeader.innerHTML = "Create Calibration for Device: " + id;
    } else {
      createCalHeader.innerHTML = "Create Calibration";
    }
  } else {
    console.error("Header element with id 'create-cal-header' not found.");
  }

  // Make the page header div
  function makePageHeaderDiv() {
    const divTitle = document.createElement("div");
    divTitle.classList.add("page-header-div");
    const pageTitle = document.createElement("h1");
    pageTitle.classList.add("page-header");
    if (id) {
      pageTitle.innerHTML = "Calibrations List: " + id;
    } else {
      pageTitle.innerHTML = "All Calibrations";
    }
    divTitle.appendChild(pageTitle);
    // Add the button to the header div
    let AddCalBtn = document.createElement("button");
    AddCalBtn.type = "submit";
    AddCalBtn.classList.add("btn", "btn-plus");
    AddCalBtn.id = "btnAddCal";
    AddCalBtn.textContent = "+ Add Cal";

    AddCalBtn.setAttribute("title", "Click to add a new calibration");

    // Add event listener to the Add Cal button immediately when creating it
    AddCalBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const createCalibrationDialog = document.querySelector(
        "[create-calibration-dialog]",
      );
      const deviceIdField = document.getElementById("device-id");

      // If we have a device ID from the URL, pre-populate the field
      if (id && deviceIdField) {
        deviceIdField.value = id;
      }

      if (createCalibrationDialog) {
        createCalibrationDialog.showModal();
      } else {
        console.error(
          "Dialog element with id 'create-calibration-dialog' not found.",
        );
      }
    });

    divTitle.appendChild(AddCalBtn);
    mainElement.appendChild(divTitle);
  }
  makePageHeaderDiv();

  function getRecords() {
    // Clear the main element
    Array.from(mainElement.children).forEach((child) => {
      if (!child.hasAttribute("create-calibration-dialog")) {
        mainElement.removeChild(child);
      }
    });
    // Create the header div again
    makePageHeaderDiv();

    // Determine the URL to fetch from based on whether we have a device ID
    const fetchUrl = id ? `${calibrationUrl}/${id}` : calibrationUrl;

    fetch(fetchUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        // If we have an id parameter, the backend route /:id already filters
        // If no id parameter, we get all records from the base route
        const displayData = data;

        let myFields = [
          "CALIBRATION_ID",
          "DEVICE_ID",
          "CALIBRATED_BY",
          "SUPPLIER_ID",
          "CALIBRATE_DATE",
          "RESULT",
          "EMPLOYEE_ID",
        ];
        // Create a scrollable container for the table
        let tableContainer = document.createElement("div");
        tableContainer.className = "table-container";
        // Calculate height accounting for filter input and header
        tableContainer.style.maxHeight = "calc(100% - 100px)"; // Fit within constrained main element
        tableContainer.style.overflowY = "auto"; // Enable vertical scrolling
        tableContainer.style.overflowX = "auto"; // Enable horizontal scrolling if needed
        tableContainer.style.border = "1px solid #ddd"; // Add border for better visual separation
        tableContainer.style.borderRadius = "4px"; // Add rounded corners
        tableContainer.style.marginTop = "10px"; // Add some top margin
        tableContainer.style.marginBottom = "20px"; // Add bottom margin

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
          if (field === "CALIBRATE_DATE") {
            th.textContent = "NEXT DUE";
          } else {
            th.textContent = field.replace(/_/g, " ");
          }
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        let tbody = document.createElement("tbody");
        if (displayData.length === 0) {
          let row = document.createElement("tr");
          let td = document.createElement("td");
          td.colSpan = myFields.length;
          td.textContent = "No records found";
          td.style.textAlign = "center";
          row.appendChild(td);
          tbody.appendChild(row);
        }
        displayData.forEach((record) => {
          let row = document.createElement("tr");
          myFields.forEach((field) => {
            let td = document.createElement("td");
            if (record[field] === "I") {
              td.textContent = "Internal";
            } else if (record[field] === "P") {
              td.textContent = "Passed";
            } else if (field.toLowerCase().endsWith("date") && record[field]) {
              const date = new Date(record[field]);
              td.textContent = `${
                date.getMonth() + 1
              }/${date.getDate()}/${date.getFullYear()}`;
            } else {
              td.textContent = record[field] || "";
            }
            row.appendChild(td);
          });
          tbody.appendChild(row);
        });
        table.appendChild(tbody);

        // Append the table to the container, then container to the main element
        tableContainer.appendChild(table);
        mainElement.appendChild(tableContainer);

        // Add filter functionality
        const filterInput = document.getElementById("calibrationSearch");
        const tableBody = table.querySelector("tbody");

        filterInput.addEventListener("input", () => {
          const filterValue = filterInput.value.toLowerCase();
          const filteredData = displayData.filter((record) =>
            myFields.some((field) =>
              (record[field] ?? "")
                .toString()
                .toLowerCase()
                .includes(filterValue),
            ),
          );

          // Clear and rebuild tbody
          tableBody.innerHTML = "";
          if (filteredData.length === 0) {
            let row = document.createElement("tr");
            let td = document.createElement("td");
            td.colSpan = myFields.length;
            td.textContent = "No records found";
            td.style.textAlign = "center";
            row.appendChild(td);
            tableBody.appendChild(row);
          } else {
            filteredData.forEach((record) => {
              let row = document.createElement("tr");
              myFields.forEach((field) => {
                let td = document.createElement("td");
                if (record[field] === "I") {
                  td.textContent = "Internal";
                } else if (record[field] === "P") {
                  td.textContent = "Passed";
                } else if (
                  field.toLowerCase().endsWith("date") &&
                  record[field]
                ) {
                  const date = new Date(record[field]);
                  td.textContent = `${
                    date.getMonth() + 1
                  }/${date.getDate()}/${date.getFullYear()}`;
                } else {
                  td.textContent = record[field] || "";
                }
                row.appendChild(td);
              });
              tableBody.appendChild(row);
            });
          }
        });
      })
      .catch((error) => {
        console.error("Error fetching records:", error);
      });
  }

  getRecords();

  // Listen for the cancel-add-calibration event
  const cancelAddCal = document.getElementById("cancel-add-calibration");
  cancelAddCal.addEventListener("click", (e) => {
    e.preventDefault();
    const createCalibrationDialog = document.querySelector(
      "[create-calibration-dialog]",
    );
    if (createCalibrationDialog) {
      createCalibrationDialog.close();
    } else {
      console.error(
        "Dialog element with id 'create-calibration-dialog' not found.",
      );
    }
  });

  let nextId;
  const submitFormAddCal = document.querySelector("#buttonAddCalibration");
  submitFormAddCal.addEventListener("click", async (e) => {
    e.preventDefault();

    const myForm = document.querySelector("#create-calibration-form");
    if (!myForm) {
      console.error("Form with id 'create-calibration-form' not found.");
      return;
    }
    const formData = new FormData(myForm);
    const data = Object.fromEntries(formData.entries());
    const deviceId = data["DEVICE_ID"].toUpperCase();

    // Check if device has an image
    try {
      const imageResponse = await fetch(`${apiUrl}/image/filename/${deviceId}`);
      const imageData = await imageResponse.json();
      const filenames = imageData.filenames || [];

      if (filenames.length === 0) {
        const shouldContinue = confirm(
          `No image found for device ${deviceId}.\n\nPlease add an image for this device.\n\nDo you want to continue without adding an image?`,
        );
        if (!shouldContinue) {
          return;
        }
      }
    } catch (error) {
      console.error("Error checking for device image:", error);
    }

    try {
      nextId = await fetch(idsUrl, { method: "GET" })
        .then((res) => res.json())
        .then((data) => {
          // console.log("Next ID fetched:", JSON.stringify(data));
          return data;
        });
    } catch (error) {
      console.error("Error fetching next ID:", error);
    }

    data["CALIBRATION_ID"] = nextId;
    data["DEVICE_ID"] = deviceId;
    data["CREATE_BY"] = user;
    const now = new Date();
    const mysqlDate = now.toISOString().slice(0, 19).replace("T", " ");
    data["CREATE_DATE"] = mysqlDate;
    if (data["EMPLOYEE_ID"]) {
      data["EMPLOYEE_ID"] = data["EMPLOYEE_ID"].toUpperCase();
    }
    if (data["SUPPLIER_ID"]) {
      data["SUPPLIER_ID"] = data["SUPPLIER_ID"].toUpperCase();
    }
    // console.log(data);

    // Send the data to the server
    fetch(calibrationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (response.ok) {
          // console.log("Calibration created successfully");
          const createCalibrationDialog = document.querySelector(
            "[create-calibration-dialog]",
          );
          if (createCalibrationDialog) {
            createCalibrationDialog.close();
          } else {
            console.error(
              "Dialog element with id 'create-calibration-dialog' not found.",
            );
          }

          // Clear the form for next entry
          myForm.reset();

          getRecords();
          // nextId = parseInt(nextId) + 1; //This is incremented in the router
          fetch(idsUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ nextId: nextId }),
          }).then((response) => {
            if (response.ok) {
              // console.log("Next ID updated successfully");
            } else {
              console.error("Error updating next ID:", response.statusText);
            }
          });
        } else {
          console.error("Error creating calibration:", response.statusText);
        }
        // call the deviceUrl and pass in the device ID and the next calibration date
        fetch(deviceUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            DEVICE_ID: data["DEVICE_ID"],
            NEXT_DATE: data["CALIBRATE_DATE"],
          }),
        }).then((response) => {
          if (response.ok) {
            // console.log("Device next date updated successfully");
          } else {
            console.error(
              "Error updating device next date:",
              response.statusText,
            );
          }
        });
      })
      .catch((error) => {
        console.error("Error creating calibration:", error);
      });
  });
});
