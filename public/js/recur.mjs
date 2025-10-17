import { loadHeaderFooter } from "/js/utils.mjs";

// Initialize header/footer
loadHeaderFooter();

class RecurringInputManager {
  constructor() {
    this.addDialog = null;
    this.addForm = null;
    this.addBtn = null;
    this.closeBtn = null;
    this.tableContainer = null;
  }

  async init() {
    // Initialize DOM elements
    this.addDialog = document.getElementById("addRecurDialog");
    this.addForm = document.getElementById("addRecurForm");
    this.addBtn = document.getElementById("addRecurBtn");
    this.closeBtn = document.getElementById("closeRecurBtn");
    this.tableContainer = document.getElementById("recurTableContainer");

    this.setupEventListeners();
    await this.loadRecurringInputs();
  }

  setupEventListeners() {
    // Add button to open dialog
    this.addBtn.addEventListener("click", () => {
      this.openAddDialog();
    });

    // Close button
    this.closeBtn.addEventListener("click", () => {
      this.closeAddDialog();
    });

    // Form submission
    this.addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // Close dialog when clicking outside
    this.addDialog.addEventListener("click", (e) => {
      if (e.target === this.addDialog) {
        this.closeAddDialog();
      }
    });

    // Handle ESC key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.addDialog.open) {
        this.closeAddDialog();
      }
    });
  }

  openAddDialog() {
    this.addForm.reset();
    this.addDialog.showModal();
    // Focus on first input
    document.getElementById("iid").focus();
  }

  closeAddDialog() {
    this.addDialog.close();
  }

  async handleFormSubmit() {
    try {
      const formData = new FormData(this.addForm);
      const recurData = {
        INPUT_ID: formData.get("INPUT_ID").trim().toUpperCase(),
        ASSIGNED_TO: formData.get("ASSIGNED_TO").trim().toUpperCase(),
        FREQUENCY: formData.get("FREQUENCY"),
        SUBJECT: formData.get("SUBJECT").trim().toUpperCase(),
      };

      // Validate required fields
      if (
        !recurData.INPUT_ID ||
        !recurData.ASSIGNED_TO ||
        !recurData.FREQUENCY ||
        !recurData.SUBJECT
      ) {
        alert("Please fill in all required fields.");
        return;
      }

      const response = await fetch("/recur", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(recurData),
      });

      if (response.ok) {
        this.closeAddDialog();
        await this.loadRecurringInputs();
        this.showSuccessMessage("Recurring input added successfully!");
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to add recurring input: ${errorText}`);
      }
    } catch (error) {
      console.error("Error adding recurring input:", error);
      alert(`Error adding recurring input: ${error.message}`);
    }
  }

  async loadRecurringInputs() {
    try {
      const response = await fetch("/recur");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const recurData = await response.json();
      this.displayRecurringInputs(recurData);
    } catch (error) {
      console.error("Error loading recurring inputs:", error);
      this.tableContainer.innerHTML = `
                <div class="error-message">
                    Error loading recurring inputs: ${error.message}
                </div>
            `;
    }
  }

  displayRecurringInputs(data) {
    if (!data || data.length === 0) {
      this.tableContainer.innerHTML = `
                <div class="no-data-message">
                    No recurring inputs found.
                </div>
            `;
      return;
    }

    const frequencyMap = {
      W: "Weekly",
      O: "Bi-Monthly (Odd)",
      M: "Monthly",
      Q: "Quarterly",
      H: "Half-Yearly",
      A: "Annually",
      BE: "Biennially",
    };

    let tableHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Master Input ID</th>
                        <th>Assigned To</th>
                        <th>Frequency</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

    data.forEach((recur) => {
      const frequencyText = frequencyMap[recur.FREQUENCY] || recur.FREQUENCY;

      tableHTML += `
                <tr>
                    <td>${recur.INPUT_ID || ""}</td>
                    <td>${recur.ASSIGNED_TO || ""}</td>
                    <td>${frequencyText}</td>
                    <td>${recur.SUBJECT || ""}</td>
                    <td>${recur.STATUS || ""}</td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="recurManager.deleteRecurringInput('${
                          recur.INPUT_ID
                        }', '${
        recur.ASSIGNED_TO
      }')" title="Delete recurring input">
                            <span class="btn-icon">🗑</span>
                        </button>
                    </td>
                </tr>
            `;
    });

    tableHTML += `
                </tbody>
            </table>
        `;

    this.tableContainer.innerHTML = tableHTML;
  }

  async deleteRecurringInput(inputId, assignedTo) {
    if (
      !confirm(
        `Are you sure you want to delete the recurring input for ${inputId} assigned to ${assignedTo}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/recur", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          INPUT_ID: inputId,
          ASSIGNED_TO: assignedTo,
        }),
      });

      if (response.ok) {
        await this.loadRecurringInputs();
        this.showSuccessMessage("Recurring input deleted successfully!");
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to delete recurring input: ${errorText}`);
      }
    } catch (error) {
      console.error("Error deleting recurring input:", error);
      alert(`Error deleting recurring input: ${error.message}`);
    }
  }

  showSuccessMessage(message) {
    // Create a temporary success message
    const successDiv = document.createElement("div");
    successDiv.className = "success-message";
    successDiv.textContent = message;
    successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;

    document.body.appendChild(successDiv);

    // Remove after 3 seconds
    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }
}

// Initialize the recurring input manager
const recurManager = new RecurringInputManager();

// Make it globally available for delete function
window.recurManager = recurManager;

// Start the application
document.addEventListener("DOMContentLoaded", () => {
  recurManager.init();
});

// Export for potential use in other modules
export default recurManager;
