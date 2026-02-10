import {
  loadHeaderFooter,
  createNotesSection,
  getUserValue,
  getDateTime,
  myport,
  createElement,
  formatDate,
  getUrlParam,
  extractText,
  timestampText,
  getApiUrl,
} from "./utils.mjs";
import {
  calculateDaysOverdue,
  createEscalationButton,
  createEscalationHistory,
} from "./escalation-utils.mjs";
import userEmails from "./users.mjs";

loadHeaderFooter();

const port = myport();
const user = await getUserValue();
const iid = getUrlParam("id");

const apiUrl = await getApiUrl();

// Replace all hardcoded URLs with dynamic apiUrl
const apiUrls = {
  input: `${apiUrl}/input/`,
  csr: `${apiUrl}/csr/`,
  ssr: `${apiUrl}/ssr/`,
};

// Wire up cancel button for collect data dialog
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "cancelCollData") {
    const dlg = document.getElementById("collectDataDialog");
    if (dlg) dlg.close();
  }
});
// Handle save for collect data dialog and POST to /csr/:iid
document.addEventListener("submit", async (e) => {
  if (e.target && e.target.id === "collectForm") {
    e.preventDefault();
    const dlg = document.getElementById("collectDataDialog");
    const form = e.target;
    try {
      // Fetch next COLLECT_ID from backend
      const nextIdRes = await fetch(`${apiUrls.csr}nextCSRId`);
      if (!nextIdRes.ok) throw new Error("Failed to get next COLLECT_ID");
      const nextCollectId = await nextIdRes.json();
      const data = {
        COLLECT_ID: nextCollectId,
        CUSTOMER_ID: form.CUSTOMER_ID.value.toUpperCase(),
        UNIT: form.UNIT.value.toUpperCase(),
        VALUE: form.VALUE.value,
        SAMPLE_DATE: form.SAMPLE_DATE.value,
        INPUT_USER: (await getUserValue()) || "",
      };
      const url = `${apiUrls.csr}${iid}`;
      const body = {};
      body["data"] = data;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save data");
      if (dlg) dlg.close();
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  }
});
// Show collect data dialog when Collect button is clicked
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "btnCollData") {
    e.preventDefault();
    const dlg = document.getElementById("collectDataDialog");
    if (dlg) dlg.showModal();
  }
});

const url = `${apiUrls.input}${iid}`;
const main = document.querySelector("main");

// Clear main element
while (main.firstChild) {
  main.removeChild(main.firstChild);
}

// Helper function to update DOM after AJAX save
async function updateAfterSave() {
  const response = await fetch(url, { method: "GET" });
  const record = await response.json();

  // Get the first (and usually only) key from the record
  const key = Object.keys(record)[0];
  const rec = record[key];

  // Update specific DOM elements
  const closedDateElem = document.querySelector("#closed");
  if (closedDateElem) {
    closedDateElem.textContent = `Closed Date: ${formatDate(rec["CLOSED_DATE"])}`;
  }

  const assignedElem = document.querySelector("#assignedto");
  if (assignedElem) {
    assignedElem.textContent = `Assigned To: ${rec["ASSIGNED_TO"]}`;
  }

  const dueDateElem = document.querySelector("#duedate");
  if (dueDateElem) {
    dueDateElem.textContent = `Due date: ${formatDate(rec["DUE_DATE"])}`;
  }

  const subjectElem = document.querySelector("#subject");
  if (subjectElem) {
    subjectElem.textContent = `Subject: ${rec["SUBJECT"]}`;
  }

  // Update notes sections
  const actionNote = document.querySelector("#actionNote");
  if (actionNote && rec["INPUT_TEXT"]) {
    actionNote.innerHTML = rec["INPUT_TEXT"].replace(/\n/g, "<br>");
  }

  const followupNote = document.querySelector("#followUpNote");
  if (followupNote && rec["FOLLOWUP_TEXT"]) {
    followupNote.innerHTML = rec["FOLLOWUP_TEXT"].replace(/\n/g, "<br>");
  }

  const responseNote = document.querySelector("#responseNote");
  if (responseNote && rec["RESPONSE_TEXT"]) {
    responseNote.innerHTML = rec["RESPONSE_TEXT"].replace(/\n/g, "<br>");
  }

  // Handle close button state
  const btnClose = document.querySelector("#btnClose");
  if (btnClose && (rec["CLOSED"] === "Y" || rec["CLOSED_DATE"])) {
    btnClose.disabled = true;
    btnClose.style.opacity = "0.5";
    btnClose.style.cursor = "not-allowed";
    btnClose.style.backgroundColor = "#e0e0e0";
    btnClose.title = "This action item is already closed";
  }
}

fetch(url, { method: "GET" })
  .then((response) => response.json())
  .then(async (record) => {
    for (const key in record) {
      const rec = record[key];

      // Create detail section
      const detailSection = createElement("section", {
        className: "section",
        id: "detailSection",
      });

      // Header elements
      const elemRpt = createElement("h1", {
        className: "header",
        text: "Action Item Detail",
      });
      const elemId = createElement("h2", {
        className: "header2",
        text: `Action Id: ${rec["INPUT_ID"]}`,
      });

      // Detail title
      const detailTitle = createElement("h3", {
        className: "span-2",
        text: "Detail",
      });

      // Detail buttons
      const detailButtons = createElement("div", {
        className: "detailButtons",
        id: "detailButtons",
      });
      detailButtons.style.display = "flex";
      detailButtons.style.gap = "0.5rem";
      const btnEditDetail = createElement("button", {
        className: "btn btnEdit",
        id: "btnEditDetail",
        text: "Edit",
        type: "submit",
      });
      btnEditDetail.style.textTransform = "capitalize";
      btnEditDetail.style.borderRadius = "0.25rem";
      btnEditDetail.style.display = "flex";
      btnEditDetail.style.alignItems = "center";
      btnEditDetail.style.justifyContent = "center";
      const btnFollowUp = createElement("button", {
        className: "btn btnEdit",
        id: "btnFollowUp",
        text: "Email",
        type: "submit",
      });
      btnFollowUp.style.textTransform = "capitalize";
      btnFollowUp.style.borderRadius = "0.25rem";
      btnFollowUp.style.display = "flex";
      btnFollowUp.style.alignItems = "center";
      btnFollowUp.style.justifyContent = "center";

      detailButtons.appendChild(btnFollowUp);
      detailButtons.appendChild(btnEditDetail);

      // Detail information elements
      const aiDate = createElement("p", {
        className: "tbl",
        text: `Request Date: ${formatDate(rec["INPUT_DATE"])}`,
      });

      const projId = createElement("p", {
        className: "tbl",
        id: "project",
        text: `Project: ${rec["PROJECT_ID"]} - ${rec["NAME"]}`,
      });

      const aiClosedDate = createElement("p", {
        className: "tbl",
        id: "closed",
        text: `Closed Date: ${formatDate(rec["CLOSED_DATE"])}`,
      });

      const aiAssTo = createElement("p", {
        className: "tbl",
        id: "assignedto",
        text: `Assigned To: ${rec["ASSIGNED_TO"]}`,
      });

      const reqBy = createElement("p", {
        className: "tbl",
        id: "requestby",
        text: `Request By: ${rec["PEOPLE_ID"]}`,
      });

      const due_date = createElement("p", {
        className: "tbl",
        id: "duedate",
        text: `Due date: ${formatDate(rec["DUE_DATE"])}`,
      });

      const elemSubject = createElement("p", {
        className: "tbl",
        id: "subject",
        text: `Subject: ${rec["SUBJECT"]}`,
      });

      // Subtitle div with close button
      const divSubTitle = createElement("div", {
        className: "subtitlewithbutton",
      });
      divSubTitle.appendChild(elemId);

      const btnClose = createElement("button", {
        className: "closebutton",
        id: "btnClose",
        text: "Close Action",
        type: "submit",
      });
      // Store record data on button for later access
      btnClose.dataset.closed = rec["CLOSED"] || "";
      btnClose.dataset.closedDate = rec["CLOSED_DATE"] || "";
      divSubTitle.appendChild(btnClose);

      // Add escalation button if overdue
      const daysOverdue = calculateDaysOverdue(rec["DUE_DATE"]);
      if (daysOverdue > 0 && rec["CLOSED"] !== "Y") {
        const escalationBtn = createEscalationButton(
          "INPUT",
          rec["INPUT_ID"],
          rec["SUBJECT"],
          rec["ASSIGNED_TO"],
          daysOverdue,
          user,
          () => {
            // Refresh page on successful escalation
            location.reload();
          },
        );
        escalationBtn.style.marginLeft = "10px";
        divSubTitle.appendChild(escalationBtn);
      }

      // Assemble detail section
      detailSection.appendChild(detailTitle);
      detailSection.appendChild(detailButtons);
      detailSection.appendChild(aiDate);
      detailSection.appendChild(aiAssTo);
      detailSection.appendChild(aiClosedDate);
      detailSection.appendChild(projId);
      detailSection.appendChild(reqBy);
      detailSection.appendChild(due_date);
      detailSection.appendChild(elemSubject);

      // Add to main
      main.appendChild(elemRpt);
      main.appendChild(divSubTitle);
      main.appendChild(detailSection);

      // Create notes sections
      createNotesSection("INPUT_TEXT", rec["INPUT_TEXT"]);
      createNotesSection(
        "FOLLOWUP_TEXT",
        rec["FOLLOWUP_TEXT"],
        null,
        rec["FOLLOWUP_DATE"],
        rec["FOLLOWUP_BY"],
      );
      createNotesSection(
        "RESPONSE_TEXT",
        rec["RESPONSE_TEXT"],
        null,
        rec["RESPONSE_DATE"],
        rec["RESPONSE_BY"],
      );

      // Add escalation history
      const escalationHistory = await createEscalationHistory(
        "INPUT",
        rec["INPUT_ID"],
      );
      main.appendChild(escalationHistory);
    }

    // ===== Response Handler =====
    const btnEditResp = document.getElementById("editResponse");
    if (btnEditResp) {
      btnEditResp.addEventListener("click", async (event) => {
        event.preventDefault();
        const responseDialog = document.querySelector("#respDialog");
        const newResponseDateInput = document.querySelector("#newResponseDate");

        // Set response date if not already set
        if (!newResponseDateInput.value) {
          newResponseDateInput.value = formatDate(new Date().toISOString());
        }

        responseDialog.showModal();

        // Cancel handler
        document.querySelector("#cancelResp").addEventListener("click", () => {
          responseDialog.close();
        });

        // Save handler
        document
          .querySelector("#saveResp")
          .addEventListener("click", async (event) => {
            event.preventDefault();

            const oldResponseText =
              document.querySelector("#responseNote").innerHTML;
            const newResponseText =
              document.querySelector("#newTextResp").value;
            const responseText = timestampText(
              user,
              newResponseText,
              oldResponseText,
            );

            const data = {
              INPUT_ID: iid,
              INPUT_USER: user,
              RESPONSE_TEXT: responseText,
              RESPONSE_DATE: newResponseDateInput.value,
              RESPONSE_BY: user,
              MODIFIED_BY: user,
              MODIFIED_DATE: getDateTime(),
            };

            await fetch(`${apiUrls.input}${iid}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data }),
            });

            responseDialog.close();
            await updateAfterSave();
          });
      });
    }

    // ===== Action Handler =====
    const btnEditAction = document.querySelector("#editAction");
    if (btnEditAction) {
      btnEditAction.addEventListener("click", async (event) => {
        event.preventDefault();
        const actionDialog = document.querySelector("#actionDialog");
        actionDialog.showModal();

        document
          .querySelector("#cancelAction")
          .addEventListener("click", () => {
            actionDialog.close();
          });

        document
          .querySelector("#saveAction")
          .addEventListener("click", async (event) => {
            event.preventDefault();

            const newActionText =
              document.querySelector("#newTextAction").value;
            if (!newActionText.trim()) {
              alert("Action text cannot be empty");
              return;
            }

            const oldActionText =
              document.querySelector("#actionNote").innerHTML;
            const actionText = timestampText(
              user,
              newActionText,
              oldActionText,
            ).replace(/\n/g, "<br>");

            const data = {
              INPUT_ID: iid,
              INPUT_USER: user,
              INPUT_TEXT: actionText,
            };

            await fetch(`${apiUrls.input}${iid}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data }),
            });

            actionDialog.close();
            await updateAfterSave();
          });
      });
    }

    // ===== Follow Up Handler =====
    const btnEditFlup = document.querySelector("#editFollowUp");
    if (btnEditFlup) {
      btnEditFlup.addEventListener("click", async (event) => {
        event.preventDefault();
        const followUpDialog = document.querySelector("#followupDialog");
        const newFollowUpDateInput = document.querySelector("#newFollowUpDate");

        // Set followup date if not already set
        if (!newFollowUpDateInput.value) {
          newFollowUpDateInput.value = formatDate(new Date().toISOString());
        }

        followUpDialog.showModal();

        document
          .querySelector("#cancelFollowUp")
          .addEventListener("click", () => {
            followUpDialog.close();
          });

        document
          .querySelector("#saveFlup")
          .addEventListener("click", async (event) => {
            event.preventDefault();

            const newFollowUpText =
              document.querySelector("#newTextFollowup").value;
            const oldFollowUpText =
              document.querySelector("#followUpNote").innerHTML;
            const followUpText = timestampText(
              user,
              newFollowUpText,
              oldFollowUpText,
            );

            const data = {
              INPUT_ID: iid,
              INPUT_USER: user,
              FOLLOWUP_TEXT: followUpText,
              FOLLOWUP_DATE: newFollowUpDateInput.value,
              FOLLOWUP_BY: user,
              MODIFIED_BY: user,
              MODIFIED_DATE: getDateTime(),
            };

            await fetch(`${apiUrls.input}${iid}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data }),
            });

            followUpDialog.close();
            await updateAfterSave();
          });
      });
    }
    // ===== Close Action Handler =====
    const btnClose = document.querySelector("#btnClose");
    if (btnClose) {
      // Disable button if record is already closed
      if (
        btnClose.dataset.closed === "Y" ||
        (btnClose.dataset.closedDate &&
          btnClose.dataset.closedDate.trim() !== "")
      ) {
        btnClose.disabled = true;
        btnClose.style.opacity = "0.5";
        btnClose.style.cursor = "not-allowed";
        btnClose.style.backgroundColor = "#e0e0e0";
        btnClose.title = "This action item is already closed";
      }

      btnClose.addEventListener("click", async (event) => {
        event.preventDefault();

        // Check if already closed
        if (
          btnClose.dataset.closed === "Y" ||
          (btnClose.dataset.closedDate &&
            btnClose.dataset.closedDate.trim() !== "")
        ) {
          alert("This action item is already closed");
          return;
        }

        let paddedId = String(iid).padStart(7, "0");
        const data = {
          INPUT_ID: paddedId,
          CLOSED: "Y",
          CLOSED_DATE: getDateTime(),
        };

        await fetch(`${apiUrls.input}close/${paddedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        // Disable the button and update visual state
        btnClose.disabled = true;
        btnClose.style.opacity = "0.5";
        btnClose.style.cursor = "not-allowed";
        btnClose.style.backgroundColor = "#e0e0e0";
        btnClose.title = "This action item is already closed";

        await updateAfterSave();
      });
    }

    // ===== Edit Detail Handler =====
    const btnEditDetail = document.querySelector("#btnEditDetail");
    if (btnEditDetail) {
      btnEditDetail.addEventListener("click", async (event) => {
        event.preventDefault();
        const detailDialog = document.querySelector("#inputDialog");
        detailDialog.showModal();

        // Populate fields
        const assignedToElem = document.querySelector("#assignedto");
        const dueDateElem = document.querySelector("#duedate");
        const projectElem = document.querySelector("#project");
        const requestByElem = document.querySelector("#requestby");
        const subjectElem = document.querySelector("#subject");

        document.querySelector("#ASSIGNED_TO").value = extractText(
          assignedToElem.textContent,
          13,
        );
        document.querySelector("#DUE_DATE").value = extractText(
          dueDateElem.textContent,
          10,
        );
        document.querySelector("#PROJECT_ID").value = extractText(
          projectElem.textContent,
          9,
        ).split(" ")[0];
        document.querySelector("#REQUESTED_BY").value = extractText(
          requestByElem.textContent,
          11,
        );
        document.querySelector("#SUBJECT").value = extractText(
          subjectElem.textContent,
          9,
        );

        document.querySelector("#cancelEdit").addEventListener("click", () => {
          detailDialog.close();
        });

        document
          .querySelector("#saveDetail")
          .addEventListener("click", async (event) => {
            event.preventDefault();

            const data = {
              INPUT_ID: iid,
              ASSIGNED_TO: document.querySelector("#ASSIGNED_TO").value,
              DUE_DATE: document.querySelector("#DUE_DATE").value,
              PROJECT_ID: document.querySelector("#PROJECT_ID").value,
              REQUESTED_BY: document.querySelector("#REQUESTED_BY").value,
              SUBJECT: document.querySelector("#SUBJECT").value,
              MODIFIED_DATE: getDateTime(),
              MODIFIED_BY: user,
            };

            await fetch(`${apiUrls.input}detail/${iid}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data }),
            });

            detailDialog.close();
            await updateAfterSave();
          });
      });
    }

    // ===== Email Handler =====
    const btnFollowUp = document.querySelector("#btnFollowUp");
    if (btnFollowUp) {
      btnFollowUp.addEventListener("click", async (event) => {
        event.preventDefault();
        const emailDialog = document.querySelector("#emailDialog");
        document.querySelector("#emailCommentText").value = "";
        emailDialog.showModal();

        document
          .querySelector("#cancelEmailComment")
          .addEventListener("click", () => {
            emailDialog.close();
          });

        document
          .querySelector("#saveEmailComment")
          .addEventListener("click", async (event) => {
            event.preventDefault();

            const assignedToText = extractText(
              document.querySelector("#assignedto").textContent,
              13,
            );
            const userEmail =
              userEmails[assignedToText] ?? userEmails["DEFAULT"];

            const actionNoteElem = document.querySelector("#actionNote");
            const followUpNoteElem = document.querySelector("#followUpNote");
            const projectText = extractText(
              document.querySelector("#project").textContent,
              9,
            ).split(" ")[0];

            const emailData = {
              INPUT_ID: iid,
              from: "quality@ci-aviation.com",
              to: userEmail,
              subject: `Action Item Updated: ${iid}`,
              text: `Project: ${projectText}\n\nAction: \n\n${
                actionNoteElem?.innerText ?? ""
              }\n\nFollow-up: \n\n${
                followUpNoteElem?.innerText ?? ""
              }\n\nEmail comment: ${
                document.querySelector("#emailCommentText").value || ""
              }`,
            };

            // Send email (fire-and-forget)
            fetch(`${apiUrls.input}email/${iid}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: emailData }),
            }).catch((err) => console.error("Error sending email:", err));

            // Update notification table
            const notifyData = {
              INPUT_ID: iid,
              ASSIGNED_TO: assignedToText,
              ACTION: "R",
            };

            try {
              await fetch(`${apiUrls.input}inputs_notify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: notifyData }),
              });
            } catch (err) {
              console.error("Error updating inputs_notify:", err);
            }

            emailDialog.close();
            await updateAfterSave();
          });
      });
    }
  });
