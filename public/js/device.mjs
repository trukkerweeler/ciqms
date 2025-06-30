import { loadHeaderFooter, myport, getUserValue } from "./utils.mjs";

loadHeaderFooter();
const port = myport();
async function initializePage() {
  let user = (await getUserValue("user")) || "Unknown User";

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
        imageBtn.innerHTML = "Image";
        divTitle.appendChild(imageBtn);

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
          // alert("Edit Device button clicked!");
          e.preventDefault();
          // set the values of the input fields in the edit device dialog
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
        let calibDiv = document.createElement("div");
        calibDiv.classList.add("section-header-edit");

        calibDiv.innerHTML = `<h2>Calibration Info</h2>`;

        let editCalibrationButton = document.createElement("button");
        editCalibrationButton.textContent = "Edit";
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

          // Show the edit calibration dialog
          document.getElementById("edit-devcal-dialog").showModal();
        });

        calibDiv.appendChild(editCalibrationButton);
        calibrationSection.appendChild(calibDiv);

        let calibrationFields = deviceFields.filter(
          (field) => !fieldsToDisplay.includes(field)
        );

        calibrationFields.forEach((field) => {
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

        sectionsDiv.appendChild(calibrationSection);
        // listen for click event on the image button
        document
          .querySelector("#imageBtn")
          .addEventListener("click", async () => {
            // alert("Image button clicked!");
            const urlParams = new URLSearchParams(window.location.search);
            const deviceId = urlParams.get("id");
            //   console.log("Device ID: ", deviceId);
            // get the modal element
            const modal = document.getElementById("view-device-image-dialog");
            // get the image element
            const imgElement = document.getElementById("device-image");

            try {
              // fetch the image from the server
              const response = await fetch(
                `http://localhost:${port}/image/${deviceId}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                  },
                }
              );

              if (!response.ok) {
                throw new Error("Image not found");
              }

              const blob = await response.blob();
              const objectURL = URL.createObjectURL(blob);
              imgElement.src = objectURL;
            } catch (error) {
              imgElement.src = "./images/default.png";
            }

            imgElement.onerror = () => {
              imgElement.src = `./images/default.png`;
            };

            // open the modal
            modal.showModal();
          });
        mainElement.appendChild(sectionsDiv);
      });
  }
  getRecords();
}

initializePage();

document.addEventListener("DOMContentLoaded", async () => {

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
      const majorLocation = document.getElementById(
        "edit-major-location"
      ).value;
      const minorLocation = document.getElementById(
        "edit-minor-location"
      ).value;
      const purchaseDate = document.getElementById("edit-purchase-date").value;
      const purchasePrice = document.getElementById(
        "edit-purchase-price"
      ).value;
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
      window.location.href = `./device.html?id=${deviceId}`;
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
      const daysRemaining = document.getElementById(
        "edit-days-remaining"
      ).value;
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
      const status = document.getElementById("edit-status").value;

      // log all the values
      console.log("Device ID: ", deviceId);
      console.log("Assi Employee ID: ", assiEmployeeId);
      console.log("Days Remaining: ", daysRemaining);
      console.log("Next Date: ", nextDate);
      console.log("Special Interval: ", specialInterval);
      console.log("Standard Interval: ", standardInterval);
      console.log("Warning Interval: ", warningInterval);
      const modDate = new Date().toISOString().slice(0, 19).replace("T", " ");

      console.log("User: ", user);
      console.log("Mod Date: ", modDate);
      const devCalEditUrl = `http://localhost:${port}/device/editdevcal`;

      fetch(devCalEditUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          DEVICE_ID: deviceId,
          ASSI_EMPLOYEE_ID: assiEmployeeId
            ? assiEmployeeId.toUpperCase()
            : assiEmployeeId,
          DAYS_REMAINING: daysRemaining,
          NEXT_DATE: nextDate,
          SPECIAL_INTERVAL: specialInterval,
          STANDARD_INTERVAL: standardInterval,
          STATUS: status ? status.toUpperCase() : status,
          WARNING_INTERVAL: warningInterval,
          MODIFIED_BY: user,
          MODIFIED_DATE: modDate,
        }),
      });
      document.getElementById("edit-devcal-dialog").close();
      window.location.href = `./device.html?id=${deviceId}`;
    });
});

// listen for changeImage
const changeImageButton = document.getElementById("changeImage");
changeImageButton.addEventListener("click", () => {
  const imagePicker = document.getElementById("imagePicker");
  if (!imagePicker.value) {
    alert("Must choose an image first.");
    return;
  }
  const file = imagePicker.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const aspectRatio = img.height / img.width;
        canvas.width = 300;
        canvas.height = 300 * aspectRatio;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const resizedImage = canvas.toDataURL("image/jpeg");
        const blob = await (await fetch(resizedImage)).blob();

        const formData = new FormData();
        formData.append("image", blob, file.name);

        const urlParams = new URLSearchParams(window.location.search);
        const deviceId = urlParams.get("id");
        formData.append("deviceId", deviceId);

        try {
          const response = await fetch(`http://localhost:${port}/image`, {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            alert("Image uploaded successfully!");
          } else {
            alert("Failed to upload image.");
          }
        } catch (error) {
          console.error("Error uploading image:", error);
          alert("An error occurred while uploading the image.");
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    // Clear the file input after upload
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
    const response = await fetch(deleteImageUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      alert("Image deleted successfully!");
    } else {
      alert("Failed to delete image.");
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
