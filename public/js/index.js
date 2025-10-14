import { loadHeaderFooter, getUserValue } from "./utils.mjs";
loadHeaderFooter();

// Check user and show maintenance section only for TKENT
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const user = await getUserValue();
    if (user === "TKENT") {
      const maintenanceSection = document.getElementById("maintenanceSection");
      if (maintenanceSection) {
        maintenanceSection.style.display = "block";
      }
    }
  } catch (error) {
    console.error("Error checking user for maintenance access:", error);
  }

  // Add click handlers for module titles (they act as primary buttons)
  setupModuleClickHandlers();
});

function setupModuleClickHandlers() {
  // Actions module
  const inputButton = document.querySelector("#ai");
  if (inputButton) {
    inputButton.addEventListener("click", () => {
      window.location.href = "inputs.html";
    });
  }

  // Nonconformance module
  const ncmButton = document.querySelector("#ncm");
  if (ncmButton) {
    ncmButton.addEventListener("click", () => {
      window.location.href = "ncms.html";
    });
  }

  // Corrective Actions module
  const caButton = document.querySelector("#ca");
  if (caButton) {
    caButton.addEventListener("click", () => {
      window.location.href = "correctives.html";
    });
  }

  // System Documents module
  const sysDocButton = document.querySelector("#sysdoc");
  if (sysDocButton) {
    sysDocButton.addEventListener("click", () => {
      window.location.href = "documents.html";
    });
  }

  // Suppliers module
  const supplierButton = document.querySelector("#supplier");
  if (supplierButton) {
    supplierButton.addEventListener("click", () => {
      window.location.href = "suppliers.html";
    });
  }

  // Competency module
  const ctaButton = document.querySelector("#cta");
  if (ctaButton) {
    ctaButton.addEventListener("click", () => {
      window.location.href = "attendance.html";
    });
  }

  // Certification module
  const certButton = document.querySelector("#cert");
  if (certButton) {
    certButton.addEventListener("click", () => {
      window.location.href = "cert.html";
    });
  }

  // Maintenance module (no primary navigation - links are in actions)
  const maintenanceButton = document.querySelector("#maintenance");
  if (maintenanceButton) {
    maintenanceButton.addEventListener("click", () => {
      // Provide visual feedback but no navigation (users use the action links)
      console.log("Maintenance section - use action links below");
    });
  }
}
