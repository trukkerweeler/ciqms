import {
  loadHeaderFooter,
  myport,
  getSessionUser,
  getApiUrl,
} from "./utils.mjs";

loadHeaderFooter();
const user = await getSessionUser();
const apiUrl = await getApiUrl();

const equipmentUrl = `${apiUrl}/equipment`;

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
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; align-items: start;">
      <div class="fields-col1">
        <p><strong>Equipment ID:</strong> ${equipment.EQUIPMENT_ID}</p>
        <p><strong>Name:</strong> ${equipment.NAME}</p>
        <p><strong>Type:</strong> ${equipment.EQUIPMENT_TYPE}</p>
        <p><strong>Customer ID:</strong> ${equipment.CUSTOMER_ID}</p>
        <p><strong>Status:</strong> ${equipment.STATUS}</p>
        <p><strong>Assigned To:</strong> ${equipment.ASSIGNED_TO}</p>
        <p><strong>Major Location:</strong> ${equipment.MAJOR_LOCATION}</p>
      </div>
      <div class="fields-col2">
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
      </div>
      <div class="images-col" id="images-col">
        <!-- Images will be added here -->
      </div>
    </div>
    <div style="margin-top: 5px;">
      <button id="editEquipmentBtn" class="btn btn-primary">Edit Equipment</button>
    </div>
  `;

  mainContent.insertBefore(equipmentDiv, mainContent.firstChild);

  // Create image/button container
  const imageContainer = document.createElement("div");
  imageContainer.style.display = "flex";
  imageContainer.style.flexDirection = "column";
  imageContainer.style.alignItems = "center";
  imageContainer.style.gap = "16px";
  imageContainer.style.marginTop = "5px";

  let imageBtn = document.createElement("button");
  imageBtn.id = "equipmentImageBtn";
  imageBtn.classList.add("btn", "btn-primary", "equipment-image-button");
  imageBtn.innerHTML = "Edit Image";
  imageBtn.style.fontSize = "0.85rem";
  imageBtn.style.padding = "2px 8px";
  imageBtn.style.height = "28px";

  imageContainer.appendChild(imageBtn);

  let seeAllBtn = document.createElement("button");
  seeAllBtn.id = "seeAllEquipmentBtn";
  seeAllBtn.classList.add("btn", "btn-primary", "equipment-image-button");
  seeAllBtn.innerHTML = "See All Images";
  seeAllBtn.style.fontSize = "0.85rem";
  seeAllBtn.style.padding = "2px 8px";
  seeAllBtn.style.height = "28px";
  imageContainer.appendChild(seeAllBtn);
  document.getElementById("images-col").appendChild(imageContainer);

  // Show equipment image on page load if it exists
  fetch(`${apiUrl}/equipmentImage/filename/${equipment.EQUIPMENT_ID}`)
    .then((response) => response.json())
    .then((result) => {
      const filenames = result.filenames;
      if (filenames.length > 0) {
        // Create image element
        const img = document.createElement("img");
        img.src = `/_equipment-images/${encodeURIComponent(filenames[0])}`;
        img.alt = "Equipment Image";
        img.style.maxWidth = "200px";
        img.style.height = "auto";
        img.style.border = "1px solid #ddd";
        img.style.borderRadius = "4px";
        img.style.cursor = "pointer";

        // Add click handler to open image dialog
        img.addEventListener("click", () => {
          const dialog = document.getElementById("view-equipment-image-dialog");
          const dialogImg = document.getElementById("equipment-image");
          dialogImg.src = img.src;
          dialog.showModal();
        });

        imageContainer.insertBefore(img, imageBtn);
      }
    })
    .catch((error) => {
      console.error("Error fetching equipment image:", error);
    });

  // Add event listener for edit button
  const editBtn = document.getElementById("editEquipmentBtn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      openEditDialog(equipment);
    });
  }

  // Add event listener for image button
  const equipmentImageBtn = document.getElementById("equipmentImageBtn");
  if (equipmentImageBtn) {
    equipmentImageBtn.addEventListener("click", () => {
      openImageDialog(equipment);
    });
  }

  // Add event listener for see all button
  const seeAllEquipmentBtn = document.getElementById("seeAllEquipmentBtn");
  if (seeAllEquipmentBtn) {
    seeAllEquipmentBtn.addEventListener("click", () => {
      openSeeAllDialog(equipment);
    });
  }
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

  // Populate image in edit dialog
  const editImage = document.getElementById("editEquipmentImage");
  fetch(`${apiUrl}/equipmentImage/filename/${equipment.EQUIPMENT_ID}`)
    .then((response) => response.json())
    .then((result) => {
      const filenames = result.filenames || [];
      if (filenames.length > 0) {
        editImage.src = `/_equipment-images/${encodeURIComponent(
          filenames[0],
        )}`;
        editImage.style.display = "block";
      } else {
        editImage.style.display = "none";
      }
    })
    .catch((error) => {
      console.error("Error fetching equipment image for edit dialog:", error);
      editImage.style.display = "none";
    });

  dialog.showModal();

  // Handle save
  document.getElementById("saveEquipmentEdit").addEventListener("click", () => {
    saveEquipmentEdit();
  });

  // Handle edit image button
  document
    .getElementById("editEquipmentImageBtn")
    .addEventListener("click", () => {
      openImageDialog(equipment);
    });

  // Handle see all images button
  document
    .getElementById("seeAllEquipmentImagesBtn")
    .addEventListener("click", () => {
      openSeeAllDialog(equipment);
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

function openImageDialog(equipment) {
  const dialog = document.getElementById("view-equipment-image-dialog");
  const imgElement = document.getElementById("equipment-image");
  const imageDiv = document.getElementById("view-equipment-image-div");

  // Hide image by default
  imgElement.style.display = "none";

  // Fetch the image filenames
  fetch(`${apiUrl}/equipmentImage/filename/${equipment.EQUIPMENT_ID}`)
    .then((response) => response.json())
    .then((result) => {
      const filenames = result.filenames || [];
      if (filenames.length > 0) {
        imgElement.src = `/_equipment-images/${encodeURIComponent(
          filenames[0],
        )}`;
        imgElement.style.display = "block";
        imgElement.onerror = () => {
          imgElement.src = "";
          imgElement.style.display = "none";
        };
      }
    })
    .catch((error) => {
      console.error("Error fetching equipment image:", error);
      imgElement.style.display = "none";
    });

  dialog.showModal();
}

function openSeeAllDialog(equipment) {
  const dialog = document.getElementById("view-all-equipment-images-dialog");
  const imagesDiv = document.getElementById("view-all-equipment-images-div");
  const imgElement = document.getElementById("currentEquipmentImage");
  const prevBtn = document.getElementById("prevEquipmentImage");
  const nextBtn = document.getElementById("nextEquipmentImage");
  const noImagesDiv = document.getElementById("noEquipmentImages");

  let filenames = [];
  let currentIndex = 0;

  // Fetch the image filenames
  fetch(`${apiUrl}/equipmentImage/filename/${equipment.EQUIPMENT_ID}`)
    .then((response) => response.json())
    .then((result) => {
      filenames = result.filenames || [];
      if (filenames.length > 0) {
        currentIndex = 0;
        showImage(currentIndex);
        imgElement.style.display = "block";
        noImagesDiv.style.display = "none";
        prevBtn.disabled = filenames.length <= 1;
        nextBtn.disabled = filenames.length <= 1;
      } else {
        imgElement.style.display = "none";
        noImagesDiv.style.display = "block";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
      }
      if (dialog) dialog.showModal();
    })
    .catch((error) => {
      console.error("Error fetching equipment images:", error);
      imgElement.style.display = "none";
      noImagesDiv.style.display = "block";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      if (dialog) dialog.showModal();
    });

  function showImage(index) {
    if (filenames.length > 0 && index >= 0 && index < filenames.length) {
      imgElement.src = `/_equipment-images/${encodeURIComponent(
        filenames[index],
      )}`;
      currentIndex = index;
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === filenames.length - 1;
    }
  }

  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      showImage(currentIndex - 1);
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentIndex < filenames.length - 1) {
      showImage(currentIndex + 1);
    }
  });
}

// Event listener for the "Cancel" button in the edit equipment dialog
const editDialog = document.getElementById("edit-equipment-dialog");
if (editDialog) {
  const cancelEditButton = editDialog.querySelector("#cancelEquipmentEdit");
  if (cancelEditButton) {
    cancelEditButton.addEventListener("click", (e) => {
      e.preventDefault();
      editDialog.close();
    });
  } else {
    console.error(
      "Button with id 'cancelEquipmentEdit' not found in edit dialog.",
    );
  }
}

// listen for changeEquipmentImage
const changeEquipmentImageButton = document.getElementById(
  "changeEquipmentImage",
);
if (changeEquipmentImageButton) {
  changeEquipmentImageButton.addEventListener("click", async () => {
    const equipmentImagePicker = document.getElementById(
      "equipmentImagePicker",
    );
    if (!equipmentImagePicker || !equipmentImagePicker.value) {
      alert("Must choose an image first.");
      return;
    }
    const file = equipmentImagePicker.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("image", file, file.name);
      const urlParams = new URLSearchParams(window.location.search);
      const equipmentId = urlParams.get("id");
      formData.append("equipmentId", equipmentId);
      try {
        const response = await fetch(`${apiUrl}/equipmentImage`, {
          method: "POST",
          body: formData,
        });
        if (response.ok) {
          alert("Image uploaded successfully!");
          // Close the dialog and reload the page to reflect the upload
          const dialog = document.getElementById("view-equipment-image-dialog");
          if (dialog) {
            dialog.close();
          }
          window.location.reload();
        } else {
          alert("Failed to upload image.");
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        alert("An error occurred while uploading the image.");
      }
      equipmentImagePicker.value = ""; // Reset the file input value
    }
  });
}

// listen for deleteEquipmentImage click event
const deleteEquipmentImageButton = document.getElementById(
  "deleteEquipmentImage",
);
if (deleteEquipmentImageButton) {
  deleteEquipmentImageButton.addEventListener("click", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const equipmentId = urlParams.get("id");
    const deleteEquipmentImageUrl = `${apiUrl}/equipmentImage/${equipmentId}`;

    try {
      const response = await fetch(deleteEquipmentImageUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const responseData = await response.json().catch(() => null);

      if (response.ok) {
        alert("Image deleted successfully!");
        // Close the dialog and reload the page to reflect the deletion
        const dialog = document.getElementById("view-equipment-image-dialog");
        if (dialog) {
          dialog.close();
        }
        window.location.reload();
      } else {
        const errorMsg = responseData?.message || "Failed to delete image.";
        console.error("Delete failed:", errorMsg);
        alert(`Failed to delete image: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("An error occurred while deleting the image.");
    }
  });
}
