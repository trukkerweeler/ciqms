import { loadHeaderFooter, getSessionUser, getApiUrl } from "./utils.mjs";

console.log("[skills.mjs] Loading...");

(async () => {
  await loadHeaderFooter();

  const apiUrl = await getApiUrl();
  const url = `${apiUrl}/skillsmaint`;
  let skillsData = [];
  let currentUser = null;
  let isEditing = false;
  let editingSkillId = null;

  async function initializeSkills() {
    console.log("[skills.mjs] Initializing");
    try {
      currentUser = await getSessionUser();
      console.log("[skills.mjs] Current user:", currentUser);

      await loadSkillsData();
      setupDialogHandlers();
    } catch (error) {
      console.error("Error initializing skills:", error);
    }
  }

  // Initialize immediately when module loads
  await initializeSkills();

  async function loadSkillsData() {
    try {
      console.log("[skills.mjs] Fetching skills from:", url);
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("[skills.mjs] Data received:", data);

      skillsData = data || [];
      renderSkillsTable(skillsData);
    } catch (error) {
      console.error("Error loading skills:", error);
      document.getElementById("skillsContainer").innerHTML =
        "<p class='error'>Error loading skills data.</p>";
    }
  }

  function setupDialogHandlers() {
    const dialog = document.getElementById("skillDialog");
    const addBtn = document.getElementById("addSkillBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const form = document.getElementById("skillForm");

    if (!dialog || !addBtn || !cancelBtn || !form) {
      console.warn("[skills.mjs] Some dialog elements not found");
      return;
    }

    // Open dialog for new skill
    addBtn.addEventListener("click", () => {
      resetForm(form);
      document.getElementById("dialogTitle").textContent = "Add New Skill";
      document.getElementById("submitBtn").textContent = "Add Skill";
      document.getElementById("skillId").disabled = false;
      isEditing = false;
      dialog.showModal();
    });

    // Close dialog
    cancelBtn.addEventListener("click", () => {
      dialog.close();
      resetForm(form);
    });

    // Close on outside click
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });

    // Handle form submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleFormSubmission(dialog, form);
    });

    // Close on ESC
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        dialog.close();
      }
    });
  }

  function resetForm(form) {
    form.reset();
    isEditing = false;
    editingSkillId = null;
    document.getElementById("skillId").disabled = false;
  }

  async function handleFormSubmission(dialog, form) {
    try {
      const formData = new FormData(form);
      // When editing, use the stored skill ID (disabled fields aren't in FormData)
      const SKILL_ID = isEditing
        ? editingSkillId
        : formData.get("skillId")?.trim() || "";
      const NAME = formData.get("skillName")?.trim() || "";
      const CATEGORY = formData.get("skillCategory")?.trim() || "";
      const STATUS = formData.get("skillStatus")?.trim() || "A";
      const REVISION_LEVEL = formData.get("revisionLevel")?.trim() || null;

      if (!SKILL_ID || !NAME || !CATEGORY) {
        alert("Skill ID, Name, and Category are required");
        return;
      }

      let method = "POST";
      const skillData = {
        SKILL_ID,
        NAME,
        CATEGORY,
        STATUS: STATUS || "A",
        REVISION_LEVEL: REVISION_LEVEL || null,
        CREATE_BY: currentUser,
        CREATED_DATE: new Date().toISOString().slice(0, 19).replace("T", " "),
      };

      // If editing, use PUT
      if (isEditing) {
        method = "PUT";
        skillData.MODIFIED_BY = currentUser;
        skillData.MODIFIED_DATE = new Date()
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");
      }

      console.log(`[skills.mjs] ${method} Submitting:`, skillData);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(skillData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(
        `[skills.mjs] Successfully ${isEditing ? "updated" : "created"} skill`,
      );
      dialog.close();
      resetForm(form);
      await loadSkillsData();
    } catch (error) {
      console.error("Error submitting skill:", error);
      alert("Error saving skill. Please try again.");
    }
  }

  function renderSkillsTable(data) {
    const container = document.getElementById("skillsContainer");
    container.innerHTML = "";

    if (!data || data.length === 0) {
      container.innerHTML = "<p>No skills found. Click + to add one.</p>";
      return;
    }

    const table = document.createElement("table");
    table.className = "table table-striped table-bordered table-hover";

    // Header
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>Skill ID</th>
        <th>Name</th>
        <th>Category</th>
        <th>Revision</th>
        <th>Issue Date</th>
        <th>Created By</th>
        <th>Created Date</th>
        <th>Actions</th>
      </tr>
    `;
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");
    data.forEach((item, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${item.SKILL_ID || ""}</strong></td>
        <td>${item.NAME || ""}</td>
        <td>${item.CATEGORY || "-"}</td>
        <td>${item.REVISION_LEVEL || "-"}</td>
        <td>${
          item.ISSUE_DATE ? new Date(item.ISSUE_DATE).toLocaleDateString() : "-"
        }</td>
        <td>${item.CREATE_BY || ""}</td>
        <td>${
          item.CREATED_DATE
            ? new Date(item.CREATED_DATE).toLocaleDateString()
            : ""
        }</td>
        <td style="white-space: nowrap;">
          <button class="button-small" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" onclick="editSkill(${index})">Edit</button>
          <button class="button-small" style="padding: 4px 8px; font-size: 12px;" onclick="deleteSkill(${index})">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  window.editSkill = function (index) {
    const skill = skillsData[index];
    if (!skill) {
      alert("Skill not found");
      return;
    }

    const form = document.getElementById("skillForm");
    const dialog = document.getElementById("skillDialog");

    editingSkillId = skill.SKILL_ID;
    document.getElementById("skillId").value = skill.SKILL_ID || "";
    document.getElementById("skillName").value = skill.NAME || "";
    document.getElementById("skillCategory").value = skill.CATEGORY || "";
    document.getElementById("skillStatus").value = skill.STATUS || "A";
    document.getElementById("revisionLevel").value = skill.REVISION_LEVEL || "";

    document.getElementById("dialogTitle").textContent =
      `Edit Skill: ${skill.SKILL_ID}`;
    document.getElementById("submitBtn").textContent = "Update Skill";
    document.getElementById("skillId").disabled = true;

    isEditing = true;
    dialog.showModal();
  };

  window.deleteSkill = async function (index) {
    const skill = skillsData[index];
    if (!skill) {
      alert("Skill not found");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete skill "${skill.SKILL_ID}: ${skill.NAME}"?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${url}/${skill.SKILL_ID}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("[skills.mjs] Successfully deleted skill");
      await loadSkillsData();
    } catch (error) {
      console.error("Error deleting skill:", error);
      alert("Error deleting skill. Please try again.");
    }
  };
})();
