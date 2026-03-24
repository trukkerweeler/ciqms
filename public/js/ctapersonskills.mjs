import { loadHeaderFooter, getSessionUser, getApiUrl } from "./utils.mjs";

console.log("[ctapersonskills.mjs] Loading...");

(async () => {
  await loadHeaderFooter();

  const apiUrl = await getApiUrl();
  const url = `${apiUrl}/ctapersonskills`;
  const jobSkillsUrl = `${apiUrl}/ctajobskills`;
  const peopleUrl = `${apiUrl}/ctapersonskills/people/active`;
  const uniqueJobsUrl = `${apiUrl}/ctapersonskills/jobs/unique`;
  const attendanceSearchUrl = `${apiUrl}/ctapersonskills/search/attendance`;

  let personSkillsData = [];
  let jobSkillsData = [];
  let peopleData = [];
  let currentUser = null;
  let selectedPersonId = null;
  let selectedJobTitle = null;

  // Initialize
  async function initializePersonSkills() {
    console.log("[ctapersonskills.mjs] Initializing");
    try {
      currentUser = await getSessionUser();
      console.log("[ctapersonskills.mjs] Current user:", currentUser);

      // Load all data in parallel
      await Promise.all([
        loadPersonSkillsData(),
        loadJobSkillsData(),
        loadPeopleData(),
      ]);

      setupDialogHandlers();
      setupFilterHandlers();
      setupSearchHandlers();
    } catch (error) {
      console.error("Error initializing person skills:", error);
    }
  }

  // Initialize immediately when module loads
  initializePersonSkills();

  async function loadPersonSkillsData() {
    try {
      console.log("[ctapersonskills.mjs] Fetching person skills from:", url);
      const response = await fetch(url, { method: "GET" });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      personSkillsData = data || [];
      console.log(
        "[ctapersonskills.mjs] Loaded",
        personSkillsData.length,
        "person skills",
      );
      renderPersonSkillsTable(personSkillsData);
    } catch (error) {
      console.error("Error loading person skills:", error);
      document.getElementById("personSkillsContainer").innerHTML =
        "<p class='error'>Error loading person skills data.</p>";
    }
  }

  async function loadJobSkillsData() {
    try {
      console.log(
        "[ctapersonskills.mjs] Fetching job skills from:",
        jobSkillsUrl,
      );
      const response = await fetch(jobSkillsUrl, { method: "GET" });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      jobSkillsData = data || [];
      console.log(
        "[ctapersonskills.mjs] Loaded",
        jobSkillsData.length,
        "job skills",
      );
      populateJobSkillDropdown();
    } catch (error) {
      console.error("Error loading job skills:", error);
    }
  }

  async function loadPeopleData() {
    try {
      console.log("[ctapersonskills.mjs] Fetching people from:", peopleUrl);
      const response = await fetch(peopleUrl, { method: "GET" });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      // Store full people data with ID and name
      peopleData = data || [];
      console.log(
        "[ctapersonskills.mjs] Loaded",
        peopleData.length,
        "active people",
      );
      populatePeopleDropdowns();
    } catch (error) {
      console.error("Error loading people:", error);
    }
  }

  function populateJobSkillDropdown() {
    const select = document.getElementById("jobTitle");
    select.innerHTML = '<option value="">-- Select Job Skill --</option>';
    // Show all unique job titles initially
    const uniqueSkills = [...new Set(jobSkillsData.map((s) => s.JOB_TITLE))];
    uniqueSkills.forEach((skill) => {
      const option = document.createElement("option");
      option.value = skill;
      option.textContent = skill;
      select.appendChild(option);
    });
  }

  function populatePeopleDropdowns() {
    const assignSelect = document.getElementById("personName");
    const filterSelect = document.getElementById("filterPerson");

    assignSelect.innerHTML = '<option value="">-- Select Person --</option>';
    filterSelect.innerHTML = '<option value="">All</option>';

    peopleData.forEach((person) => {
      const option1 = document.createElement("option");
      option1.value = person.PEOPLE_ID;
      option1.textContent = person.PEOPLE_ID;
      assignSelect.appendChild(option1);

      const option2 = document.createElement("option");
      option2.value = person.PEOPLE_ID;
      option2.textContent = person.PEOPLE_ID;
      filterSelect.appendChild(option2);
    });
  }

  function setupDialogHandlers() {
    const dialog = document.getElementById("addPersonSkillDialog");
    const addBtn = document.getElementById("addPersonSkillBtn");
    const cancelBtn = document.getElementById("cancelPersonSkillDialog");
    const form = document.getElementById("personSkillForm");

    if (!dialog || !addBtn || !cancelBtn || !form) {
      console.warn("[ctapersonskills.mjs] Some dialog elements not found");
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

  function setupFilterHandlers() {
    const filterPerson = document.getElementById("filterPerson");
    const filterJob = document.getElementById("filterJob");

    filterPerson.addEventListener("change", () => {
      selectedPersonId = filterPerson.value;
      applyFilters();
      updateSearchButtonState();
    });

    filterJob.addEventListener("change", () => {
      selectedJobTitle = filterJob.value;
      applyFilters();
      updateSearchButtonState();
    });

    // Populate job filter dropdown with unique job titles
    const filterJobSelect = document.getElementById("filterJob");
    filterJobSelect.innerHTML = '<option value="">All</option>';
    const uniqueSkills = [...new Set(jobSkillsData.map((s) => s.JOB_TITLE))];
    uniqueSkills.forEach((skill) => {
      const option = document.createElement("option");
      option.value = skill;
      option.textContent = skill;
      filterJobSelect.appendChild(option);
    });
  }

  function setupSearchHandlers() {
    const searchBtn = document.getElementById("searchAttendanceBtn");
    if (!searchBtn) {
      console.warn("[ctapersonskills.mjs] Search button not found");
      return;
    }

    searchBtn.addEventListener("click", performAttendanceSearch);
  }

  function updateSearchButtonState() {
    const searchBtn = document.getElementById("searchAttendanceBtn");
    // Enable button only if both person and job skill are selected
    searchBtn.disabled = !selectedPersonId || !selectedJobTitle;
  }

  async function performAttendanceSearch() {
    if (!selectedPersonId || !selectedJobTitle) {
      alert("Please select both a Person and a Job Skill");
      return;
    }

    try {
      // Hide the person skills table and clear it when searching
      const personSkillsContainer = document.getElementById(
        "personSkillsContainer",
      );
      personSkillsContainer.innerHTML = "";
      personSkillsContainer.style.display = "none";

      // selectedPersonId and selectedJobTitle are already set from the filter dropdowns
      console.log("[ctapersonskills.mjs] Searching attendance for:", {
        personId: selectedPersonId,
        jobTitle: selectedJobTitle,
      });

      const searchUrl = `${attendanceSearchUrl}/${selectedPersonId}/${encodeURIComponent(selectedJobTitle)}`;
      const response = await fetch(searchUrl, { method: "GET" });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      renderAttendanceResults(results);
    } catch (error) {
      console.error("Error searching attendance:", error);
      alert("Error searching attendance records. Please try again.");
    }
  }

  function renderAttendanceResults(data) {
    const resultsSection = document.getElementById("attendanceResultsSection");
    const resultsContainer = document.getElementById(
      "attendanceResultsContainer",
    );

    resultsContainer.innerHTML = "";

    if (!data || data.length === 0) {
      resultsContainer.innerHTML =
        "<p>No attendance records found for the selected person and skill.</p>";
      resultsSection.style.display = "block";
      return;
    }

    const table = document.createElement("table");
    table.className = "table table-striped table-bordered table-hover";

    // Header
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>Course ID</th>
        <th>Date/Time</th>
        <th>Instructor</th>
        <th>Minutes</th>
        <th>Created By</th>
        <th>Created Date</th>
        <th>Link</th>
      </tr>
    `;
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");
    data.forEach((item) => {
      const row = document.createElement("tr");
      const dateTime = item.DATE_TIME
        ? new Date(item.DATE_TIME).toLocaleString()
        : "-";
      const createdDate = item.CREATED_DATE
        ? new Date(item.CREATED_DATE).toLocaleDateString()
        : "-";
      const linkText = item.CTA_ATTENDANCE_LINK
        ? `<a href="${item.CTA_ATTENDANCE_LINK}" target="_blank">View</a>`
        : "-";

      row.innerHTML = `
        <td>${item.COURSE_ID || ""}</td>
        <td>${dateTime}</td>
        <td>${item.INSTRUCTOR || "-"}</td>
        <td>${item.MINUTES || "-"}</td>
        <td>${item.CREATE_BY || "-"}</td>
        <td>${createdDate}</td>
        <td>${linkText}</td>
      `;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    const wrapper = document.createElement("div");
    wrapper.className = "table-container";
    wrapper.style.maxHeight = "calc(80vh - 200px)";
    wrapper.style.overflowY = "auto";
    wrapper.appendChild(table);
    resultsContainer.appendChild(wrapper);
    resultsSection.style.display = "block";
  }

  function applyFilters() {
    // Show the person skills container and hide search results when filters change
    document.getElementById("personSkillsContainer").style.display = "block";
    document.getElementById("attendanceResultsSection").style.display = "none";

    const filterPerson = document.getElementById("filterPerson").value;
    const filterJob = document.getElementById("filterJob").value;

    const filtered = personSkillsData.filter((item) => {
      const personMatch = !filterPerson || item.PEOPLE_ID === filterPerson;
      const jobMatch = !filterJob || item.JOB_TITLE === filterJob;
      return personMatch && jobMatch;
    });

    renderPersonSkillsTable(filtered);
  }

  function closeDialog(dialog, form) {
    dialog.close();
    form.reset();
  }

  async function handleFormSubmission(dialog, form) {
    try {
      const formData = new FormData(form);
      const PEOPLE_ID = formData.get("personName").trim();
      const JOB_TITLE = formData.get("jobTitle").trim();
      const COMPETENCY = formData.get("competencyLevel").trim();
      const CERT_DATE = formData.get("certificationDate");
      const CERT_BY = formData.get("certifier").trim();
      const NOTES = formData.get("notes").trim();

      if (!PEOPLE_ID || !JOB_TITLE || !COMPETENCY) {
        alert("Person, Job Skill, and Competency Level are required");
        return;
      }

      const personSkillData = {
        PEOPLE_ID,
        JOB_TITLE,
        COMPETENCY,
        CERT_DATE: CERT_DATE || null,
        CERT_BY: CERT_BY || currentUser,
        NOTES,
        ASSIGN_DATE: new Date().toISOString().slice(0, 19).replace("T", " "),
        REQUESTED_BY: currentUser,
      };

      console.log("[ctapersonskills.mjs] Submitting:", personSkillData);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(personSkillData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("[ctapersonskills.mjs] Successfully created person skill");
      closeDialog(dialog, form);
      await loadPersonSkillsData();
    } catch (error) {
      console.error("Error creating person skill:", error);
      alert("Error assigning skill. Please try again.");
    }
  }

  function renderPersonSkillsTable(data) {
    const container = document.getElementById("personSkillsContainer");
    container.innerHTML = "";

    if (!data || data.length === 0) {
      container.innerHTML =
        "<p>No person skills found. Click + to assign one.</p>";
      return;
    }

    const table = document.createElement("table");
    table.className = "table table-striped table-bordered table-hover";

    // Header
    const thead = document.createElement("thead");
    thead.innerHTML = `
    <tr>
      <th>Person</th>
      <th>Job Skill</th>
      <th>Competency Level</th>
      <th>Certification Date</th>
      <th>Certified By</th>
      <th>Notes</th>
      <th>Assigned Date</th>
      <th>Actions</th>
    </tr>
  `;
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");
    data.forEach((item, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
      <td><strong>${item.PEOPLE_ID || ""}</strong></td>
      <td>${item.JOB_TITLE || ""}</td>
      <td>
        <span class="badge" style="background-color: ${getCompetencyColor(item.COMPETENCY)}; padding: 4px 8px; border-radius: 3px; color: white;">
          ${item.COMPETENCY || ""}
        </span>
      </td>
      <td>${item.CERT_DATE ? new Date(item.CERT_DATE).toLocaleDateString() : "-"}</td>
      <td>${item.CERT_BY || "-"}</td>
      <td>${item.NOTES || "-"}</td>
      <td>${item.ASSIGN_DATE ? new Date(item.ASSIGN_DATE).toLocaleDateString() : ""}</td>
      <td>
        <button class="button-small" onclick="deletePersonSkill(${index})">Delete</button>
      </td>
    `;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    const wrapper = document.createElement("div");
    wrapper.className = "table-container";
    wrapper.style.maxHeight = "calc(80vh - 200px)";
    wrapper.style.overflowY = "auto";
    wrapper.appendChild(table);
    container.appendChild(wrapper);
  }

  function getCompetencyColor(level) {
    const colors = {
      Basic: "#FFA500",
      Intermediate: "#4169E1",
      Advanced: "#228B22",
      Expert: "#8B008B",
    };
    return colors[level] || "#808080";
  }

  async function deletePersonSkill(index) {
    if (
      !confirm("Are you sure you want to delete this person skill assignment?")
    ) {
      return;
    }

    try {
      const personSkillId = personSkillsData[index]?.PERSON_SKILL_ID;
      if (!personSkillId) {
        alert("Error: Person skill ID not found");
        return;
      }

      const response = await fetch(`${url}/${personSkillId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("[ctapersonskills.mjs] Successfully deleted person skill");
      await loadPersonSkillsData();
    } catch (error) {
      console.error("Error deleting person skill:", error);
      alert("Error deleting person skill. Please try again.");
    }
  }

  // Expose to global scope for onclick handler
  window.deletePersonSkill = deletePersonSkill;
})();
