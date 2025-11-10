import { loadHeaderFooter, myport, getUserValue } from "./utils.mjs";

loadHeaderFooter();
const port = myport();
const user = await getUserValue();

const equipmentUrl = `http://localhost:${port}/equipment`;
console.log(`Equipment URL: ${equipmentUrl}`);

let mainElement = document.getElementById("main");

// Event listener for the "Add Equipment" button
const addEquipmentBtn = document.getElementById("btnAddEquipment");
if (!addEquipmentBtn) {
  console.error("Button with id 'btnAddEquipment' not found.");
} else {
  addEquipmentBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const createDialog = document.querySelector("[create-equipment-dialog]");
    if (createDialog) {
      // Set default values
      const purchaseDateField = document.getElementById("purchase-date");
      if (purchaseDateField && !purchaseDateField.value) {
        purchaseDateField.value = new Date().toISOString().slice(0, 10);
      }

      // Add input event listener to transform EQUIPMENT_TYPE to uppercase as user types
      const equipmentTypeField = document.getElementById("equipment-type");
      if (equipmentTypeField) {
        equipmentTypeField.addEventListener("input", (e) => {
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
      const createButton = createDialog.querySelector(
        "#create-equipment-button"
      );
      if (createButton) {
        createButton.addEventListener("click", (e) => {
          e.preventDefault();
          const formData = new FormData(createDialog.querySelector("form"));
          const equipmentData = Object.fromEntries(formData.entries());
          // Validate required fields
          const requiredFields = ["EQUIPMENT_ID", "NAME"];
          for (const field of requiredFields) {
            if (!equipmentData[field]) {
              alert(`Please fill in the required field: ${field}`);
              return;
            }
          }
          // Validate date fields
          const dateFields = ["WARRANTY_DATE"];
          for (const field of dateFields) {
            const dateValue = new Date(equipmentData[field]);
            if (isNaN(dateValue.getTime())) {
              alert(`Please enter a valid date for: ${field}`);
              return;
            }
          }
          // uppercase the EQUIPMENT_ID, STATUS, MAJOR_LOCATION, MINOR_LOCATION, EQUIPMENT_TYPE
          equipmentData["EQUIPMENT_ID"] =
            equipmentData["EQUIPMENT_ID"].toUpperCase();
          equipmentData["STATUS"] = equipmentData["STATUS"].toUpperCase();
          equipmentData["MAJOR_LOCATION"] =
            equipmentData["MAJOR_LOCATION"].toUpperCase();
          equipmentData["MINOR_LOCATION"] =
            equipmentData["MINOR_LOCATION"].toUpperCase();
          equipmentData["EQUIPMENT_TYPE"] =
            equipmentData["EQUIPMENT_TYPE"].toUpperCase();

          // Append equipmentData
          equipmentData["CREATE_BY"] = user;
          equipmentData["CREATE_DATE"] = new Date().toISOString().split("T")[0];
          // console.log(equipmentData);
          // Send the data to the server
          fetch(`${equipmentUrl}/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(equipmentData),
          })
            .then((response) => {
              if (response.ok) {
                createDialog.close();
                // clear the equipmentTable
                const equipmentTable =
                  document.getElementById("equipmentTable");
                if (equipmentTable) {
                  equipmentTable.remove();
                }
                // Show success message
                // alert("Equipment added successfully!");
                // Refresh the records
                getRecords(); // Refresh the records after adding a new equipment
              } else {
                console.error("Error adding equipment:", response.statusText);
              }
            })
            .catch((error) => {
              console.error("Error adding equipment:", error);
            });
        });
      }
    } else {
      console.error(
        "Dialog element with id 'create-equipment-dialog' is missing or not a <dialog>."
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
  fetch(equipmentUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      // Handle case where no records are found
      if (!Array.isArray(data) || data.length === 0) {
        console.log("No equipment records found");
        let tableContainer = document.createElement("div");
        tableContainer.className = "table-container";
        tableContainer.innerHTML = `<p>No equipment records found</p>`;
        mainElement.appendChild(tableContainer);
        return;
      }

      let myFields = [
        "EQUIPMENT_ID",
        "NAME",
        "EQUIPMENT_TYPE",
        "CUSTOMER_ID",
        "STATUS",
        "MAJOR_LOCATION",
        "MINOR_LOCATION",
        "WARRANTY_DATE",
      ];

      let tableContainer = document.createElement("div");
      tableContainer.style.overflowX = "auto"; // Enable horizontal scrolling
      tableContainer.className = "table-container";
      tableContainer.style.maxHeight = "calc(75vh - 60px)"; // Adjusted for filter
      tableContainer.style.overflowY = "auto"; // Enable vertical scrolling
      tableContainer.style.marginBottom = "2rem";

      let equipmentTableTemplate = `<table class="table table-striped table-bordered table-hover" id="equipmentTable" style="margin-bottom: 0;">`;
      equipmentTableTemplate += `<thead style="position: sticky; top: 0; background-color: #f8f9fa; z-index: 10;"><tr>`;
      for (const field of myFields) {
        equipmentTableTemplate += `<th>${field}</th>`;
      }
      equipmentTableTemplate += `</tr></thead>`;
      equipmentTableTemplate += `<tbody id="equipmentTableBody">`;
      for (const equipment of data) {
        equipmentTableTemplate += generateTableRow(equipment, myFields);
      }
      equipmentTableTemplate += `</tbody>`;
      equipmentTableTemplate += `</table>`;

      tableContainer.innerHTML = equipmentTableTemplate;
      mainElement.appendChild(tableContainer);

      // Add filter functionality
      const filterInput = document.getElementById("equipmentName");
      const tableBody = document.getElementById("equipmentTableBody");

      filterInput.addEventListener("input", () => {
        const filterValue = filterInput.value.toLowerCase();
        const filteredData = data.filter((equipment) =>
          myFields.some((field) =>
            (equipment[field] ?? "")
              .toString()
              .toLowerCase()
              .includes(filterValue)
          )
        );

        tableBody.innerHTML = filteredData
          .map((equipment) => generateTableRow(equipment, myFields))
          .join("");
      });
    })
    .catch((error) => {
      console.error("Error fetching equipment:", error);
    });
}

function generateTableRow(equipment, fields) {
  let rowTemplate = `<tr>`;
  for (const field of fields) {
    if (field === "EQUIPMENT_ID") {
      rowTemplate += `<td><a href="equipment.html?id=${equipment[field]}">${equipment[field]}</a></td>`;
    } else if (field === "STATUS") {
      let statusText = "";
      if (equipment[field] === "E") statusText = "EXPIRED";
      else if (equipment[field] === "C") statusText = "CURRENT";
      else if (equipment[field] === "X") statusText = "EXTEND";
      else if (equipment[field] === "D") statusText = "DISPOSED";
      else statusText = equipment[field] ?? "";
      rowTemplate += `<td>${statusText}</td>`;
    } else if (field.endsWith("DATE")) {
      const dateValue = equipment[field];
      if (dateValue) {
        const date = new Date(dateValue);
        const options = { year: "numeric", month: "2-digit", day: "2-digit" };
        const formattedDate = date.toLocaleDateString("en-US", options);
        rowTemplate += `<td>${formattedDate}</td>`;
      } else {
        rowTemplate += `<td></td>`;
      }
    } else {
      rowTemplate += `<td>${equipment[field] ?? ""}</td>`;
    }
  }
  rowTemplate += `</tr>`;
  return rowTemplate;
}

getRecords();
