import { loadHeaderFooter, myport, getUserValue } from "./utils.mjs";

loadHeaderFooter();
const port = myport();
const user = await getUserValue();

const equipmentUrl = `http://localhost:${port}/equipment`;

// Get equipment ID from URL
const urlParams = new URLSearchParams(window.location.search);
const equipmentId = urlParams.get("id");

if (!equipmentId) {
  alert("No equipment ID provided");
} else {
  fetchEquipment(equipmentId);
}

function fetchEquipment(id) {
  fetch(`${equipmentUrl}/${id}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.message) {
        alert(data.message);
        return;
      }
      displayEquipment(data);
    })
    .catch((error) => {
      console.error("Error fetching equipment:", error);
    });
}

function displayEquipment(equipment) {
  const mainContent = document.getElementById("main-content");

  // Clear existing content to prevent duplicate records
  mainContent.innerHTML = "";

  // Create display elements
  const equipmentDiv = document.createElement("div");
  equipmentDiv.innerHTML = `
    <h1>Equipment Details</h1>
    <p><strong>Equipment ID:</strong> ${equipment.EQUIPMENT_ID}</p>
    <p><strong>Name:</strong> ${equipment.NAME}</p>
    <p><strong>Type:</strong> ${equipment.EQUIPMENT_TYPE}</p>
    <p><strong>Customer ID:</strong> ${equipment.CUSTOMER_ID}</p>
    <p><strong>Status:</strong> ${equipment.STATUS}</p>
    <p><strong>Assigned To:</strong> ${equipment.ASSIGNED_TO}</p>
    <p><strong>Major Location:</strong> ${equipment.MAJOR_LOCATION}</p>
    <p><strong>Minor Location:</strong> ${equipment.MINOR_LOCATION}</p>
    <p><strong>Manufacturer:</strong> ${equipment.MANUFACTURER_NAME}</p>
    <p><strong>Model:</strong> ${equipment.MODEL_NUMBER}</p>
    <p><strong>Serial:</strong> ${equipment.SERIAL_NUMBER}</p>
    <p><strong>Purchase Date:</strong> ${
      equipment.PURCHASE_DATE ? equipment.PURCHASE_DATE.split("T")[0] : ""
    }</p>
    <p><strong>Purchase Price:</strong> ${equipment.PURCHASE_PRICE}</p>
    <p><strong>Warranty Date:</strong> ${
      equipment.WARRANTY_DATE ? equipment.WARRANTY_DATE.split("T")[0] : ""
    }</p>
    <p><strong>In Use:</strong> ${equipment.IN_USE}</p>
    <button id="editEquipmentBtn" class="btn btn-primary">Edit Equipment</button>
  `;

  mainContent.insertBefore(equipmentDiv, mainContent.firstChild);

  // Add event listener for edit button
  document.getElementById("editEquipmentBtn").addEventListener("click", () => {
    openEditDialog(equipment);
  });
}

function openEditDialog(equipment) {
  const dialog = document.getElementById("edit-equipment-dialog");
  // Populate form
  document.getElementById("edit-equipment-id").value = equipment.EQUIPMENT_ID;
  document.getElementById("edit-equipment-name").value = equipment.NAME;
  document.getElementById("edit-equipment-type").value =
    equipment.EQUIPMENT_TYPE;
  document.getElementById("edit-customer-id").value = equipment.CUSTOMER_ID;
  document.getElementById("edit-assigned-to").value = equipment.ASSIGNED_TO;
  document.getElementById("edit-manufacturer-name").value =
    equipment.MANUFACTURER_NAME;
  document.getElementById("edit-model-number").value = equipment.MODEL_NUMBER;
  document.getElementById("edit-serial-number").value = equipment.SERIAL_NUMBER;
  document.getElementById("edit-major-location").value =
    equipment.MAJOR_LOCATION;
  document.getElementById("edit-minor-location").value =
    equipment.MINOR_LOCATION;
  document.getElementById("edit-purchase-date").value = equipment.PURCHASE_DATE
    ? equipment.PURCHASE_DATE.split("T")[0]
    : "";
  document.getElementById("edit-purchase-price").value =
    equipment.PURCHASE_PRICE;
  document.getElementById("edit-warranty-date").value = equipment.WARRANTY_DATE
    ? equipment.WARRANTY_DATE.split("T")[0]
    : "";
  document.getElementById("edit-status").value = equipment.STATUS;
  document.getElementById("edit-in-use").value = equipment.IN_USE;

  dialog.showModal();

  // Handle save
  document.getElementById("saveEquipmentEdit").addEventListener("click", () => {
    saveEquipmentEdit();
  });
}

function saveEquipmentEdit() {
  const formData = new FormData(document.getElementById("edit-equipment-form"));
  const equipmentData = Object.fromEntries(formData.entries());
  equipmentData.MODIFIED_BY = user;
  equipmentData.MODIFIED_DATE = new Date().toISOString().split("T")[0];

  fetch(`${equipmentUrl}/edit`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(equipmentData),
  })
    .then((response) => {
      if (response.ok) {
        document.getElementById("edit-equipment-dialog").close();
        // Refresh
        fetchEquipment(equipmentId);
      } else {
        alert("Error updating equipment");
      }
    })
    .catch((error) => {
      console.error("Error updating equipment:", error);
    });
}
