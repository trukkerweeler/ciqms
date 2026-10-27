import { loadHeaderFooter, getSessionUser, getApiUrl } from "./utils.mjs";

console.log("[people.mjs] Loading...");

(async () => {
  await loadHeaderFooter();

  const apiUrl = await getApiUrl();
  const url = `${apiUrl}/people`;
  let peopleData = [];
  let currentUser = null;
  let isEditing = false;
  let editingPeopleId = null;

  async function initializePeople() {
    try {
      currentUser = await getSessionUser();
      await loadPeopleData();
      setupDialogHandlers();
    } catch (error) {
      console.error("[people.mjs] Error initializing people:", error);
    }
  }

  await initializePeople();

  async function loadPeopleData() {
    try {
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      peopleData = data || [];
      renderPeopleTable(peopleData);
    } catch (error) {
      console.error("[people.mjs] Error loading people:", error);
      document.getElementById("peopleContainer").innerHTML =
        "<p class='error'>Error loading people data.</p>";
    }
  }

  function setupDialogHandlers() {
    const dialog = document.getElementById("personDialog");
    const addBtn = document.getElementById("addPersonBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const form = document.getElementById("personForm");

    if (!dialog || !addBtn || !cancelBtn || !form) {
      console.warn("[people.mjs] Some dialog elements not found");
      return;
    }

    addBtn.addEventListener("click", () => {
      resetForm(form);
      document.getElementById("dialogTitle").textContent = "Add Person";
      document.getElementById("submitBtn").textContent = "Add Person";
      document.getElementById("PEOPLE_ID").disabled = false;
      dialog.showModal();
    });

    cancelBtn.addEventListener("click", () => {
      dialog.close();
      resetForm(form);
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
        resetForm(form);
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await handleFormSubmission(dialog, form);
    });

    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        dialog.close();
        resetForm(form);
      }
    });
  }

  function resetForm(form) {
    form.reset();
    isEditing = false;
    editingPeopleId = null;
    const peopleIdField = document.getElementById("PEOPLE_ID");
    if (peopleIdField) peopleIdField.disabled = false;
  }

  function buildPersonPayload(formData) {
    const payload = {};
    const fields = [
      "PEOPLE_ID",
      "LAST_NAME",
      "FIRST_NAME",
      "MIDDLE_INITIAL",
      "FUNCTION_CODE",
      "JOB_CODE",
      "START_DATE",
      "END_DATE",
      "PAY_TYPE",
      "STATUS",
      "SALARY",
      "HOURLY_COST",
      "SHIFT",
      "DEPARTMENT",
      "SUPERVISOR_ID",
      "LOCATION",
      "EMP_LEVEL",
      "WORK_PHONE",
      "OTHER_NUMBER",
      "ADDRESS_LINE_1",
      "WORK_EMAIL_ADDRESS",
      "ADDRESS_LINE_2",
      "CITY",
      "ZIP",
      "STATE",
      "HOME_PHONE",
      "SOCIAL_SECURITY",
      "BIRTH_DATE",
      "HOME_EMAIL_ADDRESS",
      "SENORITY_DATE",
      "SPECIAL_DATE",
      "ENTITY_ID",
    ];

    fields.forEach((field) => {
      const value = formData.get(field);
      payload[field] = value === null || value === undefined ? "" : String(value).trim();
    });

    payload.PEOPLE_ID = payload.PEOPLE_ID.toUpperCase();
    if (payload.SUPERVISOR_ID) payload.SUPERVISOR_ID = payload.SUPERVISOR_ID.toUpperCase();

    return payload;
  }

  async function handleFormSubmission(dialog, form) {
    try {
      const formData = new FormData(form);
      const payload = buildPersonPayload(formData);
      const peopleId = isEditing ? editingPeopleId : payload.PEOPLE_ID;

      if (!peopleId || !payload.LAST_NAME || !payload.FIRST_NAME) {
        alert("People ID, last name, and first name are required.");
        return;
      }

      const method = isEditing ? "PUT" : "POST";
      const requestUrl = isEditing ? `${url}/${encodeURIComponent(peopleId)}` : url;
      const body = {
        ...payload,
        CREATE_BY: currentUser || "System",
        CREATED_DATE: new Date().toISOString().slice(0, 19).replace("T", " "),
        MODIFIED_BY: currentUser || "System",
        MODIFIED_DATE: new Date().toISOString().slice(0, 19).replace("T", " "),
      };

      const response = await fetch(requestUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error! status: ${response.status}`);
      }

      dialog.close();
      resetForm(form);
      await loadPeopleData();
    } catch (error) {
      console.error("[people.mjs] Error saving person:", error);
      alert(error.message || "Error saving person. Please try again.");
    }
  }

  function renderPeopleTable(data) {
    const container = document.getElementById("peopleContainer");
    container.innerHTML = "";

    if (!data || data.length === 0) {
      container.innerHTML = "<p>No people found. Click + to add one.</p>";
      return;
    }

    const searchWrap = document.createElement("div");
    searchWrap.style.marginBottom = "12px";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search people...";
    searchInput.style.width = "100%";
    searchInput.style.maxWidth = "420px";
    searchInput.style.padding = "8px 10px";
    searchInput.addEventListener("input", () => {
      const value = searchInput.value.toLowerCase();
      const filtered = data.filter((person) => {
        const text = [
          person.PEOPLE_ID,
          person.LAST_NAME,
          person.FIRST_NAME,
          person.WORK_EMAIL_ADDRESS,
          person.DEPARTMENT,
          person.LOCATION,
          person.STATUS,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(value);
      });
      renderPeopleTableRows(filtered);
    });

    searchWrap.appendChild(searchInput);
    container.appendChild(searchWrap);

    const table = document.createElement("table");
    table.className = "table table-striped table-bordered table-hover";
    table.style.width = "100%";
    table.style.tableLayout = "fixed";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th style="width:12%">ID</th>
        <th style="width:18%">Name</th>
        <th style="width:14%">Department</th>
        <th style="width:14%">Location</th>
        <th style="width:16%">Work Email</th>
        <th style="width:10%">Status</th>
        <th style="width:16%">Actions</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    container.appendChild(table);
    renderPeopleTableRows(data, tbody);
  }

  function renderPeopleTableRows(rows, tbody) {
    if (!tbody) {
      const table = document.querySelector("#peopleContainer table");
      if (!table) return;
      tbody = table.querySelector("tbody");
    }

    tbody.innerHTML = "";

    rows.forEach((person) => {
      const row = document.createElement("tr");
      const fullName = [person.FIRST_NAME, person.LAST_NAME]
        .filter(Boolean)
        .join(" ");

      row.innerHTML = `
        <td><strong>${person.PEOPLE_ID || ""}</strong></td>
        <td>${fullName || "-"}</td>
        <td>${person.DEPARTMENT || "-"}</td>
        <td>${person.LOCATION || "-"}</td>
        <td>${person.WORK_EMAIL_ADDRESS || "-"}</td>
        <td>${person.STATUS === "I" ? "Inactive" : "Active"}</td>
        <td>
          <button class="button-small" data-action="edit" data-id="${person.PEOPLE_ID}">Edit</button>
          <button class="button-small" data-action="delete" data-id="${person.PEOPLE_ID}">Delete</button>
        </td>
      `;

      tbody.appendChild(row);
    });

    tbody.querySelectorAll("button[data-action='edit']").forEach((button) => {
      button.addEventListener("click", async () => {
        const personId = button.dataset.id;
        await openEditDialog(personId);
      });
    });

    tbody.querySelectorAll("button[data-action='delete']").forEach((button) => {
      button.addEventListener("click", async () => {
        const personId = button.dataset.id;
        if (!confirm(`Delete ${personId}?`)) return;

        try {
          const response = await fetch(`${url}/${encodeURIComponent(personId)}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          await loadPeopleData();
        } catch (error) {
          console.error("[people.mjs] Delete error:", error);
          alert("Unable to delete person.");
        }
      });
    });
  }

  async function openEditDialog(personId) {
    const person = peopleData.find((item) => item.PEOPLE_ID === personId);
    if (!person) return;

    isEditing = true;
    editingPeopleId = personId;

    const form = document.getElementById("personForm");
    const dialog = document.getElementById("personDialog");
    const peopleIdField = document.getElementById("PEOPLE_ID");
    const title = document.getElementById("dialogTitle");
    const submitBtn = document.getElementById("submitBtn");

    title.textContent = `Edit Person: ${personId}`;
    submitBtn.textContent = "Save Changes";
    peopleIdField.disabled = true;

    Object.entries(person).forEach(([key, value]) => {
      const field = form.querySelector(`[name="${key}"]`);
      if (!field) return;
      if (field.type === "date" && value) {
        field.value = new Date(value).toISOString().slice(0, 10);
      } else if (field.type === "number" && value !== null && value !== undefined && value !== "") {
        field.value = value;
      } else {
        field.value = value ?? "";
      }
    });

    dialog.showModal();
  }
})();
