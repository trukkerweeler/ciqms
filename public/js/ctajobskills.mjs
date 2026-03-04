import { loadHeaderFooter, getSessionUser, getApiUrl } from "./utils.mjs";

console.log("[ctajobskills.mjs] Loading...");

(async () => {
  await loadHeaderFooter();

  const apiUrl = await getApiUrl();
  const url = `${apiUrl}/ctajobskills`;
  const skillsUrl = `${apiUrl}/skills`;
  let jobSkillsData = [];
  let skillsData = [];
  let currentUser = null;

  // Initialize dialog elements
  async function initializeJobSkills() {
    console.log("[ctajobskills.mjs] Initializing");
    try {
      currentUser = await getSessionUser();
      console.log("[ctajobskills.mjs] Current user:", currentUser);

      await Promise.all([loadJobSkillsData(), loadSkillsData()]);
      setupDialogHandlers();
    } catch (error) {
      console.error("Error initializing job skills:", error);
    }
  }

  // Initialize immediately when module loads
  initializeJobSkills();

  async function loadSkillsData() {
    try {
      console.log("[ctajobskills.mjs] Fetching skills from:", skillsUrl);
      const response = await fetch(skillsUrl, { method: "GET" });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      skillsData = data || [];
      console.log("[ctajobskills.mjs] Loaded", skillsData.length, "skills");
      populateSkillDropdown();
    } catch (error) {
      console.error("Error loading skills:", error);
    }
  }

  function populateSkillDropdown() {
    const select = document.getElementById("skillId");
    select.innerHTML = '<option value="">-- Select Skill --</option>';
    skillsData.forEach((skill) => {
      const option = document.createElement("option");
      option.value = skill.SKILL_ID;
      const categoryLabel = skill.CATEGORY ? ` [${skill.CATEGORY}]` : "";
      option.textContent = `${skill.NAME}${categoryLabel}`;
      select.appendChild(option);
    });
  }

  async function loadJobSkillsData() {
    try {
      console.log("[ctajobskills.mjs] Fetching job skills from:", url);
      const response = await fetch(url, { method: "GET" });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("[ctajobskills.mjs] Data received:", data);

      jobSkillsData = data || [];
      renderJobSkillsTable(jobSkillsData);
    } catch (error) {
      console.error("Error loading job skills:", error);
      document.getElementById("jobSkillsContainer").innerHTML =
        "<p class='error'>Error loading job skills data.</p>";
    }
  }

  function setupDialogHandlers() {
    const dialog = document.getElementById("addJobSkillDialog");
    const addBtn = document.getElementById("addJobSkillBtn");
    const cancelBtn = document.getElementById("cancelJobSkillDialog");
    const form = document.getElementById("jobSkillForm");

    if (!dialog || !addBtn || !cancelBtn || !form) {
      console.warn("[ctajobskills.mjs] Some dialog elements not found");
      return;
    }

    // Open dialog
    addBtn.addEventListener("click", () => {
      dialog.showModal();
    });

    // Close dialog
    cancelBtn.addEventListener("click", () => {
      closeDialog(dialog, form);
    });

    // Close on outside click
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        closeDialog(dialog, form);
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
        closeDialog(dialog, form);
      }
    });
  }

  function closeDialog(dialog, form) {
    dialog.close();
    form.reset();
  }

  async function handleFormSubmission(dialog, form) {
    try {
      const formData = new FormData(form);
      const JOB_TITLE = formData.get("jobTitle").trim();
      const SKILL_ID = formData.get("skillId").trim();
      const REQUIRED_LEVEL = formData.get("requiredLevel").trim();

      if (!JOB_TITLE || !SKILL_ID) {
        alert("Job Title and Skill are required");
        return;
      }

      const jobSkillData = {
        JOB_TITLE,
        SKILL_ID,
        REQUIRED_LEVEL: REQUIRED_LEVEL || null,
        CREATED_BY: currentUser,
        CREATED_DATE: new Date().toISOString().slice(0, 19).replace("T", " "),
      };

      console.log("[ctajobskills.mjs] Submitting:", jobSkillData);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jobSkillData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("[ctajobskills.mjs] Successfully assigned skill to job");
      closeDialog(dialog, form);
      await loadJobSkillsData();
    } catch (error) {
      console.error("Error assigning skill to job:", error);
      alert("Error assigning skill. Please try again.");
    }
  }

  function renderJobSkillsTable(data) {
    const container = document.getElementById("jobSkillsContainer");
    container.innerHTML = "";

    if (!data || data.length === 0) {
      container.innerHTML = "<p>No job skills found. Click + to add one.</p>";
      return;
    }

    const table = document.createElement("table");
    table.className = "table table-striped table-bordered table-hover";

    // Header
    const thead = document.createElement("thead");
    thead.innerHTML = `
    <tr>
      <th>Job Title</th>
      <th>Skill Name</th>
      <th>Skill ID</th>
      <th>Category</th>
      <th>Required Level</th>
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
      <td><strong>${item.JOB_TITLE || ""}</strong></td>
      <td>${item.SKILL_NAME || ""}</td>
      <td>${item.SKILL_ID || ""}</td>
      <td>${item.CATEGORY || "-"}</td>
      <td>${item.REQUIRED_LEVEL || "-"}</td>
      <td>${item.CREATED_BY || ""}</td>
      <td>${item.CREATED_DATE ? new Date(item.CREATED_DATE).toLocaleDateString() : ""}</td>
      <td>
        <button class="button-small" onclick="deleteJobSkill(${index})">Delete</button>
      </td>
    `;
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  async function deleteJobSkill(index) {
    if (!confirm("Are you sure you want to remove this skill from the job?")) {
      return;
    }

    try {
      const jobSkillId = jobSkillsData[index]?.JOB_SKILL_ID;
      if (!jobSkillId) {
        alert("Error: Job skill ID not found");
        return;
      }

      const response = await fetch(`${url}/${jobSkillId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("[ctajobskills.mjs] Successfully removed skill from job");
      await loadJobSkillsData();
    } catch (error) {
      console.error("Error removing skill from job:", error);
      alert("Error removing skill. Please try again.");
    }
  }

  // Expose deleteJobSkill to global scope for onclick handler
  window.deleteJobSkill = deleteJobSkill;
})();
