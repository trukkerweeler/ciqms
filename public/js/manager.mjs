import {
  loadHeaderFooter,
  getUserValue,
  getDateTime,
  getApiUrl,
} from "./utils.mjs";

// ===== UTILITY FUNCTIONS =====

/**
 * Create an element with classes, id, and/or text content
 */
const createElement = (tag, { classes = [], id = "", text = "" } = {}) => {
  const element = document.createElement(tag);
  if (id) element.id = id;
  if (classes.length) element.classList.add(...classes);
  if (text) element.textContent = text;
  return element;
};

/**
 * Safely fetch and parse JSON
 */
const fetchJson = async (url, options = {}) => {
  try {
    const response = await fetch(url, { method: "GET", ...options });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Fetch error: ${url}`, error);
    throw error;
  }
};

/**
 * Format date for display
 */
const formatDisplayDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString();
};

/**
 * Format date for input field (YYYY-MM-DD)
 */
const formatInputDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toISOString().split("T")[0];
};

/**
 * Clear all child nodes from an element
 */
const clearElement = (element) => {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};

/**
 * Update summary span with question counts
 */
const updateChecklistSummary = (summarySpan) => {
  const allRows = document.querySelectorAll(".rowdiv");
  const totalQuestions = allRows.length;
  const answeredQuestions = Array.from(allRows).filter((row) => {
    const obsContent = row.querySelector(".obs-content");
    return obsContent?.textContent.trim() !== "";
  }).length;
  const unansweredQuestions = totalQuestions - answeredQuestions;
  summarySpan.textContent = `Total Questions: ${totalQuestions} | Answered: ${answeredQuestions} | Unanswered: ${unansweredQuestions}`;
};

// ===== MAIN INITIALIZATION =====

async function initManager() {
  try {
    loadHeaderFooter();

    const user = await getUserValue();
    const apiUrl = await getApiUrl();
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    const apiUrls = {
      manager: `${apiUrl}/manager/`,
      checklist: `${apiUrl}/checklist/`,
    };

    const main = document.querySelector("main");
    clearElement(main);

    // Fetch audit data
    const record = await fetchJson(`${apiUrls.manager}${id}`);

    // Render audit details and checklist
    await renderAuditDetails(record[0], main, id, apiUrl, apiUrls, urlParams);
  } catch (error) {
    console.error("Error initializing manager:", error);
    alert("Error loading audit data. Please refresh the page.");
  }
}

/**
 * Render main audit details section
 */
async function renderAuditDetails(
  auditData,
  main,
  id,
  apiUrl,
  apiUrls,
  urlParams,
) {
  // ===== HEADER SECTION =====
  const divMainTitle = createElement("div", { classes: ["main-title"] });
  const h1 = createElement("h1", {
    classes: ["header"],
    text: "Audit Manager",
  });

  const btnClose = createElement("button", {
    classes: ["btn", "btn-primary"],
    id: "btnClose",
    text: "Close",
  });

  const isAuditClosed = auditData.CLOSED === "Yes";
  if (isAuditClosed) {
    btnClose.disabled = true;
    Object.assign(btnClose.style, {
      opacity: "0.5",
      cursor: "not-allowed",
    });
  }

  divMainTitle.appendChild(h1);
  divMainTitle.appendChild(btnClose);
  main.appendChild(divMainTitle);

  // ===== DETAILS SECTION =====
  const section = createElement("section", { classes: ["details"] });
  const h2 = createElement("h2", { text: "Details" });

  const divTitleAndEdit = createElement("div", { classes: ["title-and-edit"] });
  divTitleAndEdit.appendChild(h2);

  const btnEditDetail = createElement("button", {
    classes: ["btn", "btn-primary"],
    id: "btnEditDetail",
    text: "Edit",
  });

  divTitleAndEdit.appendChild(btnEditDetail);

  const divDetailBtns = createElement("div", { classes: ["detailbtns"] });
  divDetailBtns.appendChild(divTitleAndEdit);

  const divDetailHeader = createElement("div", { classes: ["detailheader"] });
  divDetailHeader.appendChild(divDetailBtns);
  section.appendChild(divDetailHeader);

  // Add detail fields
  const fieldList = [
    "AUDIT_ID",
    "AUDIT_MANAGER_ID",
    "STANDARD",
    "SUBJECT",
    "SCHEDULED_DATE",
    "LEAD_AUDITOR",
    "AUDITEE1",
    "COMPLETION_DATE",
  ];

  for (const key of fieldList) {
    const value = auditData[key];
    let displayText = value || "";

    if (key.endsWith("DATE")) {
      if (key === "COMPLETION_DATE" && !value) {
        displayText = "";
      } else if (value) {
        displayText = formatDisplayDate(value);
      }
    }

    const p = createElement("p", {
      text: `${key.replace(/_/g, " ")}: ${displayText}`,
    });

    if (key === "AUDIT_ID") {
      p.id = "audit_id";
    }

    section.appendChild(p);
  }

  main.appendChild(section);

  // ===== CHECKLIST SECTION =====
  const sectionChecklist = createElement("section", { classes: ["checklist"] });
  const h3 = createElement("h3", { text: "Checklist" });
  h3.style.display = "inline-block";
  sectionChecklist.appendChild(h3);

  const summarySpan = createElement("span", { id: "checklistSummary" });
  Object.assign(summarySpan.style, {
    fontSize: "0.9em",
    color: "#666",
    marginLeft: "1em",
    fontWeight: "normal",
  });
  sectionChecklist.appendChild(summarySpan);

  const checklistItemsContainer = createElement("div", {
    classes: ["checklist-items"],
  });

  const btnAddQust = createElement("button", {
    classes: ["btn", "btn-primary"],
    id: "btnAddQust",
    text: "Add Checklist",
  });

  sectionChecklist.appendChild(btnAddQust);
  sectionChecklist.appendChild(checklistItemsContainer);
  main.appendChild(sectionChecklist);

  // ===== LOAD CHECKLIST ITEMS =====
  try {
    const records = await fetchJson(`${apiUrls.checklist}${id}`);
    renderChecklistItems(records, checklistItemsContainer, summarySpan);
  } catch (error) {
    console.error("Error loading checklist:", error);
  }

  // ===== EVENT LISTENERS =====
  setupDetailEditListener(btnEditDetail, auditData, id, apiUrls);
  setupAddQuestionListener(btnAddQust, id, urlParams, apiUrls);
  setupObservationListener(id, apiUrls, summarySpan);
  setupCloseAuditListener(btnClose, apiUrls, auditData, isAuditClosed);
}

/**
 * Render checklist items
 */
function renderChecklistItems(records, container, summarySpan) {
  const checklistFields = [
    "CHECKLIST_ID",
    "QUESTION",
    "OBSERVATION",
    "REFERENCE",
  ];

  const totalQuestions = records.length;
  const answeredQuestions = records.filter(
    (r) => r.OBSERVATION?.trim() !== "",
  ).length;
  const unansweredQuestions = totalQuestions - answeredQuestions;

  summarySpan.textContent = `Total Questions: ${totalQuestions} | Answered: ${answeredQuestions} | Unanswered: ${unansweredQuestions}`;

  records.forEach((record) => {
    const rowdiv = createElement("div", { classes: ["rowdiv"] });

    for (const [key, value] of Object.entries(record)) {
      if (!checklistFields.includes(key)) continue;

      switch (key) {
        case "CHECKLIST_ID": {
          const p = createElement("p", {
            classes: ["chkdet"],
            id: "checklist_id",
            text: `Checklist Id: ${value}`,
          });
          rowdiv.appendChild(p);
          break;
        }

        case "QUESTION": {
          const p = createElement("p", {
            id: "question",
            text: `${key}: ${value}`,
          });
          rowdiv.appendChild(p);
          break;
        }

        case "OBSERVATION": {
          const obsDiv = createElement("div", { classes: ["observations"] });
          const obsLabel = createElement("span", {
            classes: ["obs-label"],
            text: "OBSERVATION: ",
          });

          const obsContent = createElement("span", {
            classes: ["obs-content"],
            text: value?.trim() || "",
          });

          if (!value?.trim()) {
            obsContent.classList.add("obs-empty");
          }

          const p = createElement("p", { id: "observation" });
          p.appendChild(obsLabel);
          p.appendChild(obsContent);

          const btnEditObs = createElement("button", {
            classes: ["btn", "btn-primary", "btnEditObs"],
            text: "Observation",
          });
          btnEditObs.setAttribute("data-checklist-id", record.CHECKLIST_ID);

          obsDiv.appendChild(p);
          obsDiv.appendChild(btnEditObs);
          rowdiv.appendChild(obsDiv);
          break;
        }

        case "REFERENCE": {
          const p = createElement("p", {
            classes: ["chkdet"],
            id: "reference",
            text: `Ref.: ${value || ""}`,
          });
          rowdiv.appendChild(p);
          break;
        }
      }
    }

    container.appendChild(rowdiv);
  });
}

/**
 * Setup detail edit listener
 */
function setupDetailEditListener(btnEditDetail, auditData, id, apiUrls) {
  btnEditDetail.addEventListener("click", async (e) => {
    e.preventDefault();
    const editDialog = document.getElementById("editaudit");
    editDialog.showModal();

    document.getElementById("standard").value = auditData.STANDARD;
    document.getElementById("subject").value = auditData.SUBJECT;
    document.getElementById("scheddate").value = formatInputDate(
      auditData.SCHEDULED_DATE,
    );
    document.getElementById("leadauditor").value = auditData.LEAD_AUDITOR || "";
    document.getElementById("auditee").value = auditData.AUDITEE1 || "";

    const btnSave = document.getElementById("saveaudit");
    const handleSave = async (saveEvent) => {
      saveEvent.preventDefault();

      try {
        const editRecord = {
          STANDARD: document.getElementById("standard").value,
          SUBJECT: document.getElementById("subject").value,
          SCHEDULED_DATE: document.getElementById("scheddate").value,
          LEAD_AUDITOR: document
            .getElementById("leadauditor")
            .value.toUpperCase(),
          AUDITEE1: document.getElementById("auditee").value.toUpperCase(),
        };

        await fetchJson(`${apiUrls.manager}${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editRecord),
        });

        editDialog.close();
        window.location.reload();
      } catch (error) {
        console.error("Error saving audit details:", error);
        alert("Error saving changes. Please try again.");
      } finally {
        btnSave.removeEventListener("click", handleSave);
      }
    };

    btnSave.addEventListener("click", handleSave);
  });
}

/**
 * Setup add question listener
 */
function setupAddQuestionListener(btnAddQust, id, urlParams, apiUrls) {
  btnAddQust.addEventListener("click", async (e) => {
    e.preventDefault();
    const addQdialog = document.querySelector("#addquestion");
    addQdialog.showModal();

    const btnSaveNewQuestion = document.getElementById("savenewquestion");
    const handleSaveQuestion = async (saveEvent) => {
      saveEvent.preventDefault();

      try {
        const auditManagerId = urlParams.get("id");
        const checklistId = await fetchJson(
          `${apiUrls.checklist}nextChecklist/${auditManagerId}`,
        );

        let newQuestion = document.getElementById("newquestion").value;
        let newReference = document.getElementById("newreference").value;

        // Auto-extract reference from question if needed
        if (!newReference && newQuestion.startsWith("AS9100")) {
          const lines = newQuestion.split("\n");
          newReference = lines[0];
          newQuestion = lines.slice(1).join("\n");
        }

        const newRecord = {
          AUDIT_MANAGER_ID: auditManagerId,
          CHECKLIST_ID: checklistId.toString().padStart(7, "0"),
          QUESTION: newQuestion,
          REFERENCE: newReference,
        };

        await fetchJson(`${apiUrls.checklist}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRecord),
        });

        addQdialog.close();
        window.location.reload();
      } catch (error) {
        console.error("Error saving question:", error);
        alert("Error saving question. Please try again.");
      } finally {
        btnSaveNewQuestion.removeEventListener("click", handleSaveQuestion);
      }
    };

    btnSaveNewQuestion.addEventListener("click", handleSaveQuestion);
  });
}

/**
 * Setup observation dialog listener
 */
function setupObservationListener(id, apiUrls, summarySpan) {
  document.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("btnEditObs")) return;

    const checklistId = e.target.getAttribute("data-checklist-id");
    const editObsDialog = document.querySelector("#editobservation");
    editObsDialog.showModal();

    document.getElementById("obsid").textContent = checklistId;

    // Display the corresponding question
    const rowDiv = e.target.closest(".rowdiv");
    if (rowDiv) {
      const questionElement = rowDiv.querySelector("#question");
      if (questionElement) {
        const cleanQuestion = questionElement.textContent.replace(
          /^QUESTION:\s*/,
          "",
        );
        const questionDisplay = document.getElementById("obsQuestion");
        if (questionDisplay) {
          questionDisplay.textContent = cleanQuestion;
        }
      }
    }

    const btnSaveObservation = document.getElementById("saveobservation");
    const handleSaveObservation = async (obsEvent) => {
      obsEvent.preventDefault();

      try {
        const paddedChecklistId = checklistId.padStart(7, "0");
        const newObservation = document.getElementById("newobservation").value;

        const newRecord = {
          AUDIT_MANAGER_ID: id,
          CHECKLIST_ID: paddedChecklistId,
          OBSERVATION: newObservation,
        };

        await fetchJson(`${apiUrls.checklist}/obsn`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRecord),
        });

        // Update DOM
        document.querySelectorAll(".btnEditObs").forEach((btn) => {
          if (btn.getAttribute("data-checklist-id") === checklistId) {
            const obsContent = btn.parentElement?.querySelector(".obs-content");
            if (obsContent) {
              obsContent.textContent = newObservation;
              obsContent.classList.remove("obs-empty");
            }
          }
        });

        // Update summary
        updateChecklistSummary(summarySpan);

        document.getElementById("obsid").textContent = "";
        document.getElementById("newobservation").value = "";
        editObsDialog.close();
      } catch (error) {
        console.error("Error saving observation:", error);
        alert("Error saving observation. Please try again.");
      } finally {
        btnSaveObservation.removeEventListener("click", handleSaveObservation);
      }
    };

    btnSaveObservation.addEventListener("click", handleSaveObservation);
  });
}

/**
 * Setup close audit listener
 */
function setupCloseAuditListener(btnClose, apiUrls, auditData, isAuditClosed) {
  btnClose.addEventListener("click", async (e) => {
    e.preventDefault();

    if (isAuditClosed) {
      alert("This audit is already closed.");
      return;
    }

    try {
      const completionDate = getDateTime();
      const closeUrl = `${apiUrls.manager}completed`;
      const closeRecord = {
        AUDIT_MANAGER_ID: auditData.AUDIT_MANAGER_ID,
        COMPLETION_DATE: completionDate,
      };

      await fetchJson(closeUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(closeRecord),
      });

      // Update UI
      btnClose.disabled = true;
      Object.assign(btnClose.style, {
        opacity: "0.5",
        cursor: "not-allowed",
      });

      const detailsParagraphs = document.querySelectorAll(".details p");
      detailsParagraphs.forEach((p) => {
        if (p.textContent.includes("COMPLETION DATE")) {
          p.textContent = `COMPLETION DATE: ${formatDisplayDate(completionDate)}`;
        }
      });

      alert("Send results email to auditee");
    } catch (error) {
      console.error("Error closing audit:", error);
      alert("Error closing audit. Please try again.");
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initManager);
} else {
  initManager();
}
