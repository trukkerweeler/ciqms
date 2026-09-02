import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

console.log("[trainingmatrix.mjs] Loading...");

const COMPETENCY_LEVELS = ["Basic", "Intermediate", "Advanced", "Expert"];

(async () => {
  await loadHeaderFooter();

  const apiUrl = await getApiUrl();

  // --- Tab switching ---
  const tabs = document.querySelectorAll(".matrix-tab");
  const panels = document.querySelectorAll(".matrix-panel");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.panel).classList.add("active");

      if (tab.dataset.panel === "allPanel" && !allLoaded) {
        loadAllMatrix();
      }
    });
  });

  // --- Employee panel ---
  const employeeSelect = document.getElementById("employeeSelect");

  loadPeople().then((people) => populatePeopleDropdown(people));

  employeeSelect.addEventListener("change", () => {
    if (!employeeSelect.value) return;
    const selected = employeeSelect.options[employeeSelect.selectedIndex];
    const personLabel = selected ? selected.textContent : employeeSelect.value;
    loadPersonMatrix(employeeSelect.value, personLabel);
  });

  // --- All employees panel ---
  let allLoaded = false;

  async function loadPeople() {
    try {
      const res = await fetch(`${apiUrl}/trainingmatrix/people`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("[trainingmatrix.mjs] Error loading people:", e);
      return [];
    }
  }

  function populatePeopleDropdown(people) {
    employeeSelect.innerHTML =
      '<option value="">-- Select Employee --</option>';
    people.forEach((p) => {
      const option = document.createElement("option");
      option.value = p.PEOPLE_ID;
      const name = [p.FIRST_NAME, p.LAST_NAME].filter(Boolean).join(" ");
      option.textContent = name ? `${p.PEOPLE_ID} \u2013 ${name}` : p.PEOPLE_ID;
      employeeSelect.appendChild(option);
    });
  }

  async function loadPersonMatrix(personId, personLabel) {
    const container = document.getElementById("matrixContainer");
    container.innerHTML = '<p class="loading">Loading matrix&hellip;</p>';
    try {
      const res = await fetch(
        `${apiUrl}/trainingmatrix/person/${encodeURIComponent(personId)}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderPersonMatrix(personId, personLabel, data);
    } catch (e) {
      console.error("[trainingmatrix.mjs] Error loading matrix:", e);
      container.innerHTML =
        '<p class="error">Error loading training matrix.</p>';
    }
  }

  function renderPersonMatrix(personId, personLabel, rows) {
    const container = document.getElementById("matrixContainer");
    container.innerHTML = "";

    if (!rows || rows.length === 0) {
      container.innerHTML = `<p>No job assignments found for <strong>${personId}</strong>.
        Assign job skills via <a href="/person-jobs.html">Person Jobs</a>.</p>`;
      return;
    }

    // Group rows by job title
    const byJob = {};
    rows.forEach((r) => {
      if (!byJob[r.JOB_TITLE]) {
        byJob[r.JOB_TITLE] = {
          competency: r.RECORDED_COMPETENCY,
          certDate: r.CERT_DATE,
          certBy: r.CERT_BY,
          skills: [],
        };
      }
      byJob[r.JOB_TITLE].skills.push(r);
    });

    const totalSkills = rows.length;
    const trainedSkills = rows.filter((r) => r.LAST_TRAINING_DATE).length;
    const pct =
      totalSkills > 0 ? Math.round((trainedSkills / totalSkills) * 100) : 0;

    const header = document.createElement("div");
    header.className = "matrix-employee-header";
    header.innerHTML = `
      <h2>${personLabel || personId}</h2>
      <div class="matrix-summary">
        <span>Jobs assigned: <strong>${Object.keys(byJob).length}</strong></span>
        <span>Skills required: <strong>${totalSkills}</strong></span>
        <span>Skills with training: <strong>${trainedSkills}</strong></span>
        <span class="pct-badge ${pctClass(pct)}">${pct}% trained</span>
      </div>
    `;
    container.appendChild(header);

    Object.entries(byJob).forEach(([jobTitle, job]) => {
      const jobTrained = job.skills.filter((s) => s.LAST_TRAINING_DATE).length;
      const jobTotal = job.skills.length;
      const jobPct =
        jobTotal > 0 ? Math.round((jobTrained / jobTotal) * 100) : 0;

      const section = document.createElement("div");
      section.className = "matrix-job-section";

      const certInfo = job.certDate
        ? `&nbsp;&nbsp;Certified: <strong>${new Date(job.certDate).toLocaleDateString()}</strong> by ${job.certBy || "&mdash;"}`
        : "";

      section.innerHTML = `
        <div class="matrix-job-header">
          <h3>${jobTitle}</h3>
          <div>
            Recorded competency: <strong>${job.competency || "&mdash;"}</strong>${certInfo}
            <span class="pct-badge job-pct ${pctClass(jobPct)}">${jobPct}%</span>
          </div>
        </div>
      `;

      const table = document.createElement("table");
      table.className =
        "table table-striped table-bordered table-hover matrix-table";
      table.innerHTML = `
        <thead>
          <tr>
            <th>Skill / Course</th>
            <th>Category</th>
            <th>Required Level</th>
            <th>Last Training</th>
            <th>Instructor</th>
            <th>Status</th>
          </tr>
        </thead>
      `;

      const tbody = document.createElement("tbody");
      job.skills.forEach((skill) => {
        const tr = document.createElement("tr");
        const trained = !!skill.LAST_TRAINING_DATE;
        const lastDate = trained
          ? new Date(skill.LAST_TRAINING_DATE).toLocaleDateString()
          : "&mdash;";

        // Flag when recorded job competency falls below a skill's required level
        let gapFlag = "";
        if (skill.REQUIRED_LEVEL && job.competency) {
          const reqIdx = COMPETENCY_LEVELS.indexOf(skill.REQUIRED_LEVEL);
          const recIdx = COMPETENCY_LEVELS.indexOf(job.competency);
          if (recIdx >= 0 && reqIdx >= 0 && recIdx < reqIdx) {
            gapFlag =
              ' <span class="competency-gap" title="Recorded competency is below required level">\u26a0</span>';
          }
        }

        const statusPill = trained
          ? '<span class="status-pill trained" title="Training on record">Trained</span>'
          : '<span class="status-pill missing" title="No training record">No Record</span>';

        tr.innerHTML = `
          <td><strong>${skill.SKILL_NAME || skill.SKILL_ID}</strong><br>
              <small class="skill-id">${skill.SKILL_ID || ""}</small></td>
          <td>${skill.CATEGORY || "&mdash;"}</td>
          <td>${skill.REQUIRED_LEVEL || "&mdash;"}${gapFlag}</td>
          <td>${lastDate}</td>
          <td>${skill.LAST_INSTRUCTOR || "&mdash;"}</td>
          <td>${statusPill}</td>
        `;
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      section.appendChild(table);
      container.appendChild(section);
    });
  }

  async function loadAllMatrix() {
    allLoaded = true;
    const container = document.getElementById("allMatrixContainer");
    container.innerHTML =
      '<p class="loading">Loading all employees&hellip;</p>';
    try {
      const res = await fetch(`${apiUrl}/trainingmatrix/all`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderAllMatrix(data);
    } catch (e) {
      console.error("[trainingmatrix.mjs] Error loading all matrix:", e);
      container.innerHTML =
        '<p class="error">Error loading employee matrix.</p>';
    }
  }

  function renderAllMatrix(rows) {
    const container = document.getElementById("allMatrixContainer");
    container.innerHTML = "";

    if (!rows || rows.length === 0) {
      container.innerHTML = `<p>No employee job assignments found.
        Use <a href="/person-jobs.html">Person Jobs</a> to assign jobs to employees.</p>`;
      return;
    }

    const note = document.createElement("p");
    note.className = "matrix-instruction";
    note.textContent =
      "Click any row to view that employee\u2019s detailed matrix.";
    container.appendChild(note);

    const wrap = document.createElement("div");
    wrap.className = "table-container";

    const table = document.createElement("table");
    table.className =
      "table table-striped table-bordered table-hover all-matrix-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Employee</th>
          <th>Job Title</th>
          <th>Competency</th>
          <th>Required Skills</th>
          <th>Skills Trained</th>
          <th>Completion</th>
          <th>Status</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.title = "Click to view detailed matrix";

      const req = row.REQUIRED_SKILLS || 0;
      const trained = row.TRAINED_SKILLS || 0;
      const pct = req > 0 ? Math.round((trained / req) * 100) : 0;
      const name = [row.FIRST_NAME, row.LAST_NAME].filter(Boolean).join(" ");

      const statusPill =
        pct === 100
          ? '<span class="status-pill complete">Complete</span>'
          : pct > 0
            ? '<span class="status-pill partial">Partial</span>'
            : '<span class="status-pill missing">Missing</span>';

      tr.innerHTML = `
        <td><strong>${row.PEOPLE_ID}</strong>${name ? `<br><small>${name}</small>` : ""}</td>
        <td>${row.JOB_TITLE}</td>
        <td>${row.RECORDED_COMPETENCY || "&mdash;"}</td>
        <td>${req}</td>
        <td>${trained}</td>
        <td>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill ${pctClass(pct)}" style="width:${pct}%"></div>
          </div>
          <span class="completion-value">${pct}%</span>
        </td>
        <td>${statusPill}</td>
      `;

      tr.addEventListener("click", () => {
        // Switch to employee tab and load this person
        document.querySelector('[data-panel="employeePanel"]').click();
        employeeSelect.value = row.PEOPLE_ID;
        const selected = employeeSelect.options[employeeSelect.selectedIndex];
        const personLabel = selected ? selected.textContent : row.PEOPLE_ID;
        loadPersonMatrix(row.PEOPLE_ID, personLabel);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  function pctClass(pct) {
    if (pct === 100) return "green";
    if (pct >= 50) return "yellow";
    return "red";
  }
})();
