import {
  loadHeaderFooter,
  myport,
  getUserValue,
  timestampAndJoinNotes,
} from "./utils.mjs";

// Debug mode flag - set to true to enable console logging
const DEBUG_MODE = false;

loadHeaderFooter();
const port = myport();
let user = (await getUserValue("user")) || "Unknown User";

async function initializePage() {
  // read the url parameter
  const urlParams = new URLSearchParams(window.location.search);
  const deviceId = urlParams.get("id");

  const deviceUrl = `http://localhost:${port}/device/${deviceId}`;

  function getRecords() {
    fetch(deviceUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        // console.log("Device data: ", data);
        if (data.message === "No records found") {
          let mainElement = document.getElementById("main-content");
          mainElement.innerHTML = "<p>No device found</p>";
          return;
        }
        let mainElement = document.getElementById("main-content");
        const divTitle = document.createElement("div");
        divTitle.classList.add("page-header-div");

        let pagetitlewithId = `Device Detail: ${data["DEVICE_ID"]}`;
        let pageTitle = document.createElement("h1");
        pageTitle.classList.add("page-header");
        pageTitle.innerHTML = pagetitlewithId;
        divTitle.appendChild(pageTitle);

        let imageBtn = document.createElement("button");
        imageBtn.id = "imageBtn";
        imageBtn.classList.add("btn", "btn-primary", "image-button");
        imageBtn.innerHTML = "Edit Image";
        imageBtn.style.fontSize = "0.85rem";
        imageBtn.style.padding = "2px 8px";
        imageBtn.style.height = "28px";
        // Create image/button container
        const imageContainer = document.createElement("div");
        imageContainer.style.display = "flex";
        imageContainer.style.alignItems = "flex-end";
        imageContainer.style.gap = "16px";
        imageContainer.appendChild(imageBtn);

        let seeAllBtn = document.createElement("button");
        seeAllBtn.id = "seeAllBtn";
        seeAllBtn.classList.add("btn", "btn-primary", "image-button");
        seeAllBtn.innerHTML = "See All Images";
        seeAllBtn.style.fontSize = "0.85rem";
        seeAllBtn.style.padding = "2px 8px";
        seeAllBtn.style.height = "28px";

        // Add event listener for See All Images button
        seeAllBtn.addEventListener("click", async () => {
          const modal = document.getElementById(
            "view-all-device-images-dialog"
          );
          const imgElement = document.getElementById("currentDeviceImage");
          const prevBtn = document.getElementById("prevDeviceImage");
          const nextBtn = document.getElementById("nextDeviceImage");
          const noImagesDiv = document.getElementById("noDeviceImages");

          let filenames = [];
          let currentIndex = 0;

          try {
            const filenameRes = await fetch(
              `http://localhost:${port}/image/filename/${data["DEVICE_ID"]}`
            );
            const filenameJson = await filenameRes.json();
            filenames = filenameJson.filenames || [];

            if (filenames.length > 0) {
              currentIndex = 0;
              imgElement.src = `/_device-images/${encodeURIComponent(
                filenames[0]
              )}`;
              imgElement.style.display = "block";
              noImagesDiv.style.display = "none";
              prevBtn.disabled = true;
              nextBtn.disabled = filenames.length <= 1;
            } else {
              imgElement.style.display = "none";
              noImagesDiv.style.display = "block";
              prevBtn.disabled = true;
              nextBtn.disabled = true;
            }
          } catch (error) {
            console.error("Error fetching images:", error);
            imgElement.style.display = "none";
            noImagesDiv.style.display = "block";
            prevBtn.disabled = true;
            nextBtn.disabled = true;
          }

          modal.showModal();

          // Remove old event listeners and add new ones
          const newPrevBtn = prevBtn.cloneNode(true);
          const newNextBtn = nextBtn.cloneNode(true);
          prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
          nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

          newPrevBtn.addEventListener("click", () => {
            if (currentIndex > 0) {
              currentIndex--;
              imgElement.src = `/_device-images/${encodeURIComponent(
                filenames[currentIndex]
              )}`;
              newPrevBtn.disabled = currentIndex === 0;
              newNextBtn.disabled = false;
            }
          });

          newNextBtn.addEventListener("click", () => {
            if (currentIndex < filenames.length - 1) {
              currentIndex++;
              imgElement.src = `/_device-images/${encodeURIComponent(
                filenames[currentIndex]
              )}`;
              newPrevBtn.disabled = false;
              newNextBtn.disabled = currentIndex === filenames.length - 1;
            }
          });
        });

        imageContainer.appendChild(seeAllBtn);
        // Show device image on page load if it exists
        fetch(`http://localhost:${port}/image/filename/${data["DEVICE_ID"]}`)
          .then((response) => response.json())
          .then((result) => {
            const filenames = result.filenames;
            if (filenames.length > 0) {
              let mainImage = document.createElement("img");
              mainImage.id = "main-device-image";
              mainImage.alt = "Device Image";
              mainImage.src = `/_device-images/${encodeURIComponent(
                filenames[0]
              )}`;
              imageContainer.appendChild(mainImage);
            } else {
              // No image found, show placeholder
              let noImageDiv = document.createElement("div");
              noImageDiv.id = "main-device-image";
              noImageDiv.style.width = "200px";
              noImageDiv.style.padding = "20px";
              noImageDiv.style.textAlign = "center";
              noImageDiv.style.color = "#888";
              noImageDiv.style.border = "1px dashed #ccc";
              noImageDiv.style.borderRadius = "4px";
              noImageDiv.textContent = "No image";
              imageContainer.appendChild(noImageDiv);
            }
          });
        divTitle.appendChild(imageContainer);
        // ...existing code...
        // Add image display logic
        imageBtn.addEventListener("click", () => {
          // Remove any previous preview image before opening dialog
          let oldImg = document.getElementById("device-image-preview");
          if (oldImg) oldImg.remove();
          // Fetch the image filename from DEVICE_IMAGES table
          fetch(`http://localhost:${port}/image/filename/${data["DEVICE_ID"]}`)
            .then((response) => response.json())
            .then((result) => {
              const filenames = result.filenames || [];
              const imageFilename = filenames.length > 0 ? filenames[0] : null;
              if (imageFilename) {
                const img = document.createElement("img");
                img.id = "device-image-preview";
                img.src = `/_device-images/${encodeURIComponent(
                  imageFilename
                )}`;
                img.alt = "Device Image";
                img.style.maxWidth = "400px";
                img.style.maxHeight = "400px";
                divTitle.appendChild(img);
                // Remove preview image when dialog closes
                const modal = document.getElementById(
                  "view-device-image-dialog"
                );
                if (modal) {
                  modal.addEventListener(
                    "close",
                    () => {
                      let previewImg = document.getElementById(
                        "device-image-preview"
                      );
                      if (previewImg) previewImg.remove();
                    },
                    { once: true }
                  );
                }
              } else {
                alert("No image available for this device.");
              }
            })
            .catch(() => {
              alert("No image available for this device.");
            });
        });

        let calibrationsBtn = document.createElement("button");
        calibrationsBtn.id = "calibrationsBtn";
        calibrationsBtn.classList.add(
          "btn",
          "btn-primary",
          "calibrations-button"
        );
        calibrationsBtn.innerHTML = "View Calibrations";
        calibrationsBtn.addEventListener("click", () => {
          window.location.href = `./calibrations.html?id=${data["DEVICE_ID"]}`;
        });
        // Move calibrationsBtn to bottom of divTitle
        divTitle.appendChild(calibrationsBtn);
        mainElement.appendChild(divTitle);

        let deviceFields = [
          "ASSI_EMPLOYEE_ID",
          "DAYS_REMAINING",
          "DEVICE_ID",
          "NAME",
          "DEVICE_TYPE",
          "MANUFACTURER_NAME",
          "MODEL",
          "PURCHASE_DATE",
          "PURCHASE_PRICE",
          "SERIAL_NUMBER",
          "STATUS",
          "MAJOR_LOCATION",
          "MINOR_LOCATION",
          "NEXT_DATE",
          "SPECIAL_INTERVAL",
          "STANDARD_INTERVAL",
          "WARNING_INTERVAL",
          "DEVICE_NOTE",
        ];
        let sectionsDiv = document.createElement("div");
        sectionsDiv.classList.add("sections-div");

        let deviceSection = document.createElement("section");
        let deviceDiv = document.createElement("div");
        deviceDiv.classList.add("section-header-edit");
        deviceDiv.innerHTML = `<h2>Device Info</h2>`;

        let editDeviceButton = document.createElement("button");
        editDeviceButton.classList.add("btn", "btn-primary", "edit-button");
        editDeviceButton.id = "btnEditDevice";
        editDeviceButton.textContent = "Edit";
        editDeviceButton.addEventListener("click", (e) => {
          e.preventDefault();
          document.getElementById("edit-device-id").value = data["DEVICE_ID"];
          document.getElementById("edit-device-name").value = data["NAME"];
          document.getElementById("edit-device-type").value =
            data["DEVICE_TYPE"];
          document.getElementById("edit-manufacturer-name").value =
            data["MANUFACTURER_NAME"];
          document.getElementById("edit-model").value = data["MODEL"];
          document.getElementById("edit-serial-number").value =
            data["SERIAL_NUMBER"];
          document.getElementById("edit-major-location").value =
            data["MAJOR_LOCATION"];
          document.getElementById("edit-minor-location").value =
            data["MINOR_LOCATION"];
          document.getElementById("edit-purchase-date").value = data[
            "PURCHASE_DATE"
          ]
            ? data["PURCHASE_DATE"].slice(0, 10)
            : "";
          document.getElementById("edit-purchase-date").value =
            document.getElementById("edit-purchase-date").value || "";
          document.getElementById("edit-purchase-price").value =
            data["PURCHASE_PRICE"];
          document.getElementById("edit-status").value = data["STATUS"];

          document.getElementById("edit-device-dialog").showModal();
        });

        deviceDiv.appendChild(editDeviceButton);
        deviceSection.appendChild(deviceDiv);

        let fieldsToDisplay = [
          "DEVICE_ID",
          "NAME",
          "DEVICE_TYPE",
          "MANUFACTURER_NAME",
          "MODEL",
          "SERIAL_NUMBER",
          "MAJOR_LOCATION",
          "MINOR_LOCATION",
          "PURCHASE_DATE",
          "PURCHASE_PRICE",
        ];

        fieldsToDisplay.forEach((field) => {
          let deviceDiv = document.createElement("div");
          deviceDiv.classList.add("device-info-field");
          if (field.endsWith("DATE") && data[field]) {
            let date = new Date(data[field]);
            deviceDiv.innerHTML = `<strong>${field.replace(
              /_/g,
              " "
            )}:</strong> ${date.toLocaleDateString()}`;
          } else {
            deviceDiv.innerHTML = `<strong>${field.replace(
              /_/g,
              " "
            )}:</strong> ${data[field] || ""}`;
          }
          deviceSection.appendChild(deviceDiv);
        });

        sectionsDiv.appendChild(deviceSection);

        // =====================================================
        // Calibration section
        let calibrationSection = document.createElement("section");
        calibrationSection.classList.add("calibration-section");
        calibrationSection.id = "calibration-section";
        let calibDiv = document.createElement("div");
        calibDiv.classList.add("section-header-edit");

        calibDiv.innerHTML = `<h2>Calibration Info</h2>`;

        let editCalibrationButton = document.createElement("button");
        editCalibrationButton.textContent = "Edit";
        editCalibrationButton.style.display = "none";
        if (
          user === "TKENT" ||
          user === "superuser" ||
          user === "QC2" ||
          user === "BOBBI"
        ) {
          editCalibrationButton.style.display = "inline-block";
        }
        editCalibrationButton.classList.add(
          "btn",
          "btn-primary",
          "edit-button"
        );
        editCalibrationButton.addEventListener("click", () => {
          document.getElementById("edit-assi-employee-id").value =
            data["ASSI_EMPLOYEE_ID"] || "";
          document.getElementById("edit-days-remaining").value =
            data["DAYS_REMAINING"] || "";
          document.getElementById("edit-next-date").value = data["NEXT_DATE"]
            ? new Date(data["NEXT_DATE"]).toISOString().slice(0, 10)
            : "";
          document.getElementById("edit-special-interval").value =
            data["SPECIAL_INTERVAL"] || "";
          document.getElementById("edit-standard-interval").value =
            data["STANDARD_INTERVAL"] || "";
          document.getElementById("edit-warning-interval").value =
            data["WARNING_INTERVAL"] || "";

          document.getElementById("edit-devcal-dialog").showModal();
        });

        calibDiv.appendChild(editCalibrationButton);
        calibrationSection.appendChild(calibDiv);

        let calibrationFields = deviceFields.filter(
          (field) => !fieldsToDisplay.includes(field)
        );

        calibrationFields.forEach((field) => {
          if (field === "DEVICE_NOTE") return;
          let calibrationDiv = document.createElement("div");
          calibrationDiv.classList.add("device-info-field");
          if (field.endsWith("DATE") && data[field]) {
            let date = new Date(data[field]);
            calibrationDiv.innerHTML = `<strong>${field.replace(
              /_/g,
              " "
            )}:</strong> ${date.toLocaleDateString()}`;
          } else {
            calibrationDiv.innerHTML = `<strong>${field.replace(
              /_/g,
              " "
            )}:</strong> ${data[field] || ""}`;
          }
          calibrationSection.appendChild(calibrationDiv);
        });

        // Now append calibrationsBtn as the last object in calibrationSection
        calibrationSection.appendChild(calibrationsBtn);

        sectionsDiv.appendChild(calibrationSection);
        // =====================================================
        // Notes section
        let notesSection = document.createElement("section");
        notesSection.classList.add("calibration-section");
        notesSection.id = "notes-section";
        let notesDiv = document.createElement("div");
        notesDiv.classList.add("section-header-edit");
        notesDiv.style.paddingTop = "12px"; // Match top padding of other section headers
        notesDiv.innerHTML = `<h2>Notes</h2>`;
        let editNotesButton = document.createElement("button");
        editNotesButton.id = "btnEditNotes";
        editNotesButton.textContent = "Edit";
        editNotesButton.style.display = "none";
        if (user === "TKENT" || user === "superuser" || user === "QC2") {
          editNotesButton.style.display = "inline-block";
        }
        editNotesButton.classList.add("btn", "btn-primary", "edit-button");
        editNotesButton.style.marginTop = "0"; // Remove any default margin
        editNotesButton.addEventListener("click", () => {
          document.getElementById("editNotes").showModal();
        });

        notesDiv.appendChild(editNotesButton);
        notesSection.appendChild(notesDiv);

        let notesContentDiv = document.createElement("div");
        notesContentDiv.classList.add("device-info-field", "notes-content");
        notesContentDiv.id = "notesContentDiv";
        notesContentDiv.innerHTML = data["DEVICE_NOTE"]
          ? data["DEVICE_NOTE"]
          : "No notes available.";
        notesSection.appendChild(notesContentDiv);

        sectionsDiv.appendChild(notesSection);

        // listen for click event on the image button
        document
          .querySelector("#imageBtn")
          .addEventListener("click", async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const deviceId = urlParams.get("id");
            const modal = document.getElementById("view-device-image-dialog");
            const imgElement = document.getElementById("device-image");
            const imageDiv = document.getElementById("view-device-image-div");

            // Hide image by default
            imgElement.style.display = "none";
            // Remove any previous placeholder
            let placeholder = imageDiv.querySelector(".no-image-placeholder");
            if (placeholder) imageDiv.removeChild(placeholder);

            // Fetch the image filenames from DEVICE_IMAGES
            try {
              const filenameRes = await fetch(
                `http://localhost:${port}/image/filename/${deviceId}`
              );
              const filenameJson = await filenameRes.json();
              const filenames = filenameJson.filenames;
              if (filenames.length > 0) {
                imgElement.src = `/_device-images/${encodeURIComponent(
                  filenames[0]
                )}`;
                imgElement.style.display = "block";
                imgElement.onerror = () => {
                  imgElement.src = "";
                  imgElement.style.display = "none";
                  if (!imageDiv.querySelector(".no-image-placeholder")) {
                    const placeholder = document.createElement("div");
                    placeholder.className = "no-image-placeholder";
                    placeholder.textContent = "No image found";
                    placeholder.style.textAlign = "center";
                    placeholder.style.padding = "24px";
                    placeholder.style.color = "#888";
                    imageDiv.appendChild(placeholder);
                  }
                };
              } else {
                // No image filenames, show placeholder
                imgElement.src = "";
                imgElement.style.display = "none";
                placeholder = document.createElement("div");
                placeholder.className = "no-image-placeholder";
                placeholder.textContent = "No image found";
                placeholder.style.textAlign = "center";
                placeholder.style.padding = "24px";
                placeholder.style.color = "#888";
                imageDiv.appendChild(placeholder);
              }
            } catch (error) {
              // Network or other error, show placeholder
              imgElement.src = "";
              imgElement.style.display = "none";
              placeholder = document.createElement("div");
              placeholder.className = "no-image-placeholder";
              placeholder.textContent = "No image found";
              placeholder.style.textAlign = "center";
              placeholder.style.padding = "24px";
              placeholder.style.color = "#888";
              imageDiv.appendChild(placeholder);
            }
            modal.showModal();

            // Hide image when dialog closes
            modal.addEventListener(
              "close",
              () => {
                imgElement.src = "";
                imgElement.style.display = "none";
              },
              { once: true }
            );
          });
        mainElement.appendChild(sectionsDiv);
      });
  }
  getRecords();
}

initializePage();

document
  .getElementById("saveDeviceEdit")
  .addEventListener("click", async (e) => {
    e.preventDefault();
    const user = (await getUserValue("user")) || "Unknown User";
    const deviceId = document.getElementById("edit-device-id").value;
    const deviceName = document.getElementById("edit-device-name").value;
    const deviceType = document.getElementById("edit-device-type").value;
    const manufacturerName = document.getElementById(
      "edit-manufacturer-name"
    ).value;
    const model = document.getElementById("edit-model").value;
    const serialNumber = document.getElementById("edit-serial-number").value;
    const majorLocation = document.getElementById("edit-major-location").value;
    const minorLocation = document.getElementById("edit-minor-location").value;
    const purchaseDate = document.getElementById("edit-purchase-date").value;
    const purchasePrice = document.getElementById("edit-purchase-price").value;
    const modDate = new Date().toISOString().slice(0, 19).replace("T", " ");

    const deviceEditUrl = `http://localhost:${port}/device/editdevice`;
    fetch(deviceEditUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        DEVICE_ID: deviceId,
        NAME: deviceName,
        DEVICE_TYPE: deviceType,
        MANUFACTURER_NAME: manufacturerName,
        MODEL: model,
        SERIAL_NUMBER: serialNumber,
        MAJOR_LOCATION: majorLocation,
        MINOR_LOCATION: minorLocation,
        PURCHASE_DATE: purchaseDate,
        PURCHASE_PRICE: purchasePrice,
        MODIFIED_DATE: modDate,
        MODIFIED_BY: user,
      }),
    });
    document.getElementById("edit-device-dialog").close();
    window.location.reload();
  });

document
  .getElementById("saveDevcalEdit")
  .addEventListener("click", async (e) => {
    e.preventDefault();
    let user = (await getUserValue()) || "Unknown User";
    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = urlParams.get("id");
    const assiEmployeeId = document.getElementById(
      "edit-assi-employee-id"
    ).value;
    const daysRemaining = document.getElementById("edit-days-remaining").value;
    const nextDate = document.getElementById("edit-next-date").value;
    const specialInterval = document.getElementById(
      "edit-special-interval"
    ).value;
    const standardInterval = document.getElementById(
      "edit-standard-interval"
    ).value;
    const warningInterval = document.getElementById(
      "edit-warning-interval"
    ).value;
    const statusSelect = document.getElementById("status");
    const status = statusSelect.value;
    if (!status || status === "SELECT STATUS") {
      alert("Please select a valid status.");
      return;
    }

    // // log all the values
    // console.log("Device ID: ", deviceId);
    // console.log("Assi Employee ID: ", assiEmployeeId);
    // console.log("Days Remaining: ", daysRemaining);
    // console.log("Next Date: ", nextDate);
    // console.log("Special Interval: ", specialInterval);
    // console.log("Standard Interval: ", standardInterval);
    // console.log("Warning Interval: ", warningInterval);
    // console.log("User: ", user);
    const modDate = new Date().toISOString().slice(0, 19).replace("T", " ");
    // console.log("Mod Date: ", modDate);
    if (DEBUG_MODE) console.log("Status: ", status);

    const devCalEditUrl = `http://localhost:${port}/device/editdevcal`;

    // Build the JSON object for the request body
    const devCalEditData = {
      DEVICE_ID: deviceId,
      ASSI_EMPLOYEE_ID: assiEmployeeId
        ? assiEmployeeId.toUpperCase()
        : assiEmployeeId,
      DAYS_REMAINING: daysRemaining,
      NEXT_DATE: nextDate,
      SPECIAL_INTERVAL: specialInterval,
      STANDARD_INTERVAL: standardInterval,
      WARNING_INTERVAL: warningInterval,
      MODIFIED_BY: user,
      MODIFIED_DATE: modDate,
    };
    if (status && status !== "SELECT STATUS") {
      devCalEditData.STATUS = status.toUpperCase();
    }

    fetch(devCalEditUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(devCalEditData),
    }).then(() => {
      document.getElementById("edit-devcal-dialog").close();
      window.location.href = `./device.html?id=${deviceId}`;
    });
  });

// listen for changeImage
const changeImageButton = document.getElementById("changeImage");
changeImageButton.addEventListener("click", async () => {
  const imagePicker = document.getElementById("imagePicker");
  if (!imagePicker.value) {
    alert("Must choose an image first.");
    return;
  }
  const file = imagePicker.files[0];
  if (file) {
    const formData = new FormData();
    formData.append("image", file, file.name);
    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = urlParams.get("id");
    formData.append("deviceId", deviceId);
    try {
      const response = await fetch(`http://localhost:${port}/image`, {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        alert("Image uploaded and copied successfully!");
      } else {
        alert("Failed to upload image.");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("An error occurred while uploading the image.");
    }
    imagePicker.value = ""; // Reset the file input value
  }
});

// listen for deleteImage click event
const deleteImageButton = document.getElementById("deleteImage");
deleteImageButton.addEventListener("click", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const deviceId = urlParams.get("id");
  const deleteImageUrl = `http://localhost:${port}/image/${deviceId}`;

  try {
    if (DEBUG_MODE)
      console.log(`Attempting to delete image for device ${deviceId}`);
    const response = await fetch(deleteImageUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (DEBUG_MODE) console.log(`Delete response status: ${response.status}`);
    const responseData = await response.json().catch(() => null);
    if (DEBUG_MODE) console.log("Delete response data:", responseData);

    if (response.ok) {
      alert("Image deleted successfully!");
      // Close the dialog and reload the page to reflect the deletion
      const dialog = document.getElementById("view-device-image-dialog");
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

// Event listener for the "Cancel" button in the edit device dialog
const editDialog = document.getElementById("edit-device-dialog");
if (editDialog) {
  const cancelEditButton = editDialog.querySelector("#cancelDeviceEdit");
  if (cancelEditButton) {
    cancelEditButton.addEventListener("click", (e) => {
      e.preventDefault();
      editDialog.close();
    });
  } else {
    console.error(
      "Button with id 'cancelDeviceEdit' not found in edit dialog."
    );
  }
} else {
  console.error(
    "Dialog element with attribute 'edit-device-dialog' is missing or not a <dialog>."
  );
}

// Event listener for the "Save" button in the edit notes dialog
const saveNotes = document.getElementById("saveNotes");
if (saveNotes) {
  saveNotes.addEventListener("click", (e) => {
    e.preventDefault();
    const notesTextarea = document.getElementById("notes-textarea");
    const newNotes = notesTextarea.value;

    // Save the notes (you can implement the actual save logic here)
    const urlSaveDeviceNote = `http://localhost:${port}/device/savenote`;
    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = urlParams.get("id");
    // get the existing notes content div
    let oldNotesContentDiv = document.getElementById("notesContentDiv");
    // need to prepend the existing notes with a timestamp and separator
    const timestamp = new Date().toLocaleString();
    const oldNotes =
      oldNotesContentDiv.textContent === "No notes available."
        ? ""
        : oldNotesContentDiv.textContent;
    const updatedNotes = timestampAndJoinNotes(oldNotes, newNotes, user);
    // console.log("Updated Notes: ", updatedNotes);

    // send to server
    fetch(urlSaveDeviceNote, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: deviceId,
        notes: updatedNotes,
      }),
    });

    const editNotesDialog = document.getElementById("editNotes");
    editNotesDialog.close();
    if (deviceId) {
      window.location.href = `./device.html?id=${deviceId}`;
    } else {
      window.location.reload();
    }
  });
}
