import { loadHeaderFooter, getUserValue, myport, getApiUrl } from "./utils.mjs";
import {
  calculateDaysOverdue,
  createEscalationButton,
  createEscalationHistory,
} from "./escalation-utils.mjs";
loadHeaderFooter();
const user = await getUserValue();
const port = myport();
const apiUrl = await getApiUrl();

// Get the id from the url
let urlParams = new URLSearchParams(window.location.search);
let caid = urlParams.get("id");
let url = `${apiUrl}/corrective/${caid}`;

const main = document.querySelector("main");
const closebutton = document.getElementById("btnClose");
const editbutton = document.getElementById("editaction");
const button = document.getElementById("detailsearch");

// Delete the child nodes of the main element
while (main.firstChild) {
  main.removeChild(main.firstChild);
}

// Helper function to disable and grey out close button
function disableCloseButton() {
  const closeBtn = document.getElementById("btnCloseCA");
  if (closeBtn) {
    closeBtn.disabled = true;
    closeBtn.style.opacity = "0.5";
    closeBtn.style.cursor = "not-allowed";
    closeBtn.style.backgroundColor = "#e0e0e0";
    closeBtn.title = "This corrective action is already closed";
  }
}

// Helper function to update DOM after AJAX save
async function updateAfterSave() {
  const response = await fetch(url, { method: "GET" });
  const record = await response.json();
  const rec = record[0];

  // Update correction section
  const correctionTextElem = document.querySelector("#correctiontext");
  if (correctionTextElem && rec["CORRECTION_TEXT"]) {
    correctionTextElem.innerHTML = rec["CORRECTION_TEXT"].replace(
      /\n/g,
      "<br>",
    );
  }

  const actionerElem = document.querySelector("#actioner");
  if (actionerElem) {
    const actioner = rec["ACTION_BY"] ? rec["ACTION_BY"].toUpperCase() : "";
    actionerElem.textContent = "Action By: " + actioner;
  }

  // Update cause section
  const causeTextElem = document.querySelector("#causetext");
  if (causeTextElem && rec["CAUSE_TEXT"]) {
    causeTextElem.innerHTML = rec["CAUSE_TEXT"].replace(/\n/g, "<br>");
  }

  // Update control/systemic section
  const controlTextElem = document.querySelector("#controltext");
  if (controlTextElem && rec["CONTROL_TEXT"]) {
    controlTextElem.innerHTML = rec["CONTROL_TEXT"].replace(/\n/g, "<br>");
  }
}

fetch(url, { method: "GET" })
  .then((response) => response.json())
  .then(async (record) => {
    // console.log(record);
    let caid = record[0]["CORRECTIVE_ID"];
    for (const key in record) {
      // Header =======================================
      const mainTitle = document.createElement("h1");
      const divSubTitle = document.createElement("div");
      divSubTitle.setAttribute("class", "subtitlewithbutton");
      const subTitle = document.createElement("h2");
      mainTitle.textContent = "Corrective Action Report";
      mainTitle.setAttribute("class", "header");

      subTitle.textContent =
        "Corrective Id: " +
        record[key]["CORRECTIVE_ID"] +
        " - " +
        record[key]["TITLE"];
      subTitle.setAttribute("class", "header2");

      // Create close button
      const closebutton = document.createElement("button");
      closebutton.setAttribute("class", "closebutton");
      closebutton.setAttribute("id", "btnCloseCA");
      closebutton.textContent = "Close CA";

      // Disable close button if already closed
      if (
        record[key]["CLOSED"] === "Y" ||
        (record[key]["CLOSED_DATE"] &&
          record[key]["CLOSED_DATE"] !== "0000-00-00" &&
          record[key]["CLOSED_DATE"] !== "")
      ) {
        closebutton.disabled = true;
        closebutton.style.opacity = "0.5";
        closebutton.style.cursor = "not-allowed";
        closebutton.style.backgroundColor = "#e0e0e0";
        closebutton.title = "This corrective action is already closed";
      }

      divSubTitle.appendChild(subTitle);
      divSubTitle.appendChild(closebutton);

      // Add escalation button if overdue
      const daysOverdue = calculateDaysOverdue(record[key]["DUE_DATE"]);
      if (daysOverdue > 0 && record[key]["CLOSED"] !== "Y") {
        const escalationBtn = createEscalationButton(
          "CORRECTIVE",
          record[key]["CORRECTIVE_ID"],
          record[key]["TITLE"],
          record[key]["ASSIGNED_TO"],
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

      // Detail section=======================================
      const detailSection = document.createElement("section");
      detailSection.setAttribute("class", "section");
      detailSection.setAttribute("id", "detailSection");
      const detailHeader = document.createElement("h3");
      detailHeader.textContent = "Details";
      const caDate = document.createElement("p");
      caDate.setAttribute("class", "actiondate");
      if (record[key]["CORRECTIVE_DATE"]) {
        caDate.innerHTML =
          "Issue Date:" + " " + record[key]["CORRECTIVE_DATE"].substring(0, 10);
      } else {
        caDate.innerHTML = "Issue Date:" + " " + "";
      }
      caDate.setAttribute("class", "tbl");
      const caAssTo = document.createElement("p");
      caAssTo.textContent = "Assigned To:" + " " + record[key]["ASSIGNED_TO"];
      caAssTo.setAttribute("class", "tbl");
      caAssTo.setAttribute("id", "assignedto");
      const caClosedDate = document.createElement("p");
      if (
        record[key]["CLOSED_DATE"] === null ||
        record[key]["CLOSED_DATE"] === "0000-00-00" ||
        record[key]["CLOSED_DATE"] === "" ||
        record[key]["CLOSED_DATE"].length === 0
      ) {
        caClosedDate.textContent = "Closed Date:" + " " + "";
      } else {
        caClosedDate.textContent =
          "Closed Date:" + " " + record[key]["CLOSED_DATE"].substring(0, 10);
        // closebutton.disabled = true;
      }
      caClosedDate.setAttribute("class", "tbl");
      const caRef = document.createElement("p");
      caRef.textContent = "Reference:" + " " + record[key]["REFERENCE"];
      caRef.setAttribute("class", "tbl");
      caRef.setAttribute("id", "reference");
      const reqBy = document.createElement("p");
      reqBy.textContent = "Request By:" + " " + record[key]["REQUEST_BY"];
      reqBy.setAttribute("class", "tbl");
      reqBy.setAttribute("id", "requestby");
      const project = document.createElement("p");
      if (record[key]["PROJECT_ID"] === null) {
        project.textContent = "Project:" + " " + "(No project)";
      } else {
        project.textContent = "Project:" + " " + record[key]["PROJECT_ID"];
      }
      project.setAttribute("class", "tbl");
      project.setAttribute("id", "project");

      const btnDetails = document.createElement("button");
      btnDetails.setAttribute("id", "btnDetails");
      btnDetails.setAttribute("class", "btnEditNotes");
      btnDetails.textContent = "Edit";
      btnDetails.addEventListener("click", (e) => {
        e.preventDefault();
        // load values to the form
        document.getElementById("assignedto").value =
          record[key]["ASSIGNED_TO"];
        document.getElementById("reference").value = record[key]["REFERENCE"];
        document.getElementById("requestby").value = record[key]["REQUEST_BY"];
        document.getElementById("project").value = record[key]["PROJECT_ID"];
        // show the dialog
        document.getElementById("detailsDialog").showModal();

        // save the changes
        document
          .getElementById("detailSave")
          .addEventListener("click", async (e) => {
            e.preventDefault();
            // get the values from the form
            let assignedto = document
              .getElementById("assignedto")
              .value.toUpperCase();
            let reference = document.getElementById("reference").value;
            let requestby = document
              .getElementById("requestby")
              .value.toUpperCase();
            let project = document.getElementById("project").value;
            // update the record
            let url = `${apiUrl}/corrective/${caid}`;
            await fetch(url, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ASSIGNED_TO: assignedto,
                REFERENCE: reference,
                REQUEST_BY: requestby,
                PROJECT_ID: project,
              }),
            });
            // close the dialog
            document.getElementById("detailsDialog").close();
            // reload the page
            location.reload();
          });
      });

      // close button
      // const btnClose = document.createElement('button');
      // btnClose.setAttribute('id', 'btnClose');
      // btnClose.setAttribute('class', 'btnEditNotes');
      // btnClose.textContent = 'Close';

      closebutton.addEventListener("click", async (e) => {
        e.preventDefault();
        // If not TKENT, do not allow to close
        if (user !== "TKENT") {
          alert("Only TKENT can close the CA");
          return;
        }
        const closeUrl = `${apiUrl}/corrective/${caid}/close`;
        await fetch(closeUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            MODIFIED_BY: user,
            CLOSED: "Y",
            CLOSED_DATE: new Date().toISOString(),
          }),
        });
        // Disable the button and grey it out
        disableCloseButton();
        // Update the DOM with fresh data
        await updateAfterSave();
      });

      const detailButtons = document.createElement("div");
      detailButtons.setAttribute("class", "detailButtons");
      detailButtons.setAttribute("id", "detailButtons");
      // detailButtons.appendChild(btnClose);
      detailButtons.appendChild(btnDetails);

      const empty = document.createElement("p");

      // Append the elements to the detail section
      detailSection.appendChild(detailHeader);
      // detailSection.appendChild(btnClose);
      detailSection.appendChild(detailButtons);
      detailSection.appendChild(empty);
      detailSection.appendChild(caDate);
      detailSection.appendChild(caAssTo);
      detailSection.appendChild(caClosedDate);
      detailSection.appendChild(caRef);
      detailSection.appendChild(reqBy);
      detailSection.appendChild(project);

      // Trend section=======================================
      const trendSection = document.createElement("section");
      trendSection.setAttribute("id", "trendSection");
      trendSection.setAttribute("class", "notes-section");
      const trendHeader = document.createElement("h3");
      trendHeader.textContent = "NC Trend";
      const trendText = document.createElement("p");
      trendText.textContent = record[key]["NC_TREND"];
      trendText.innerHTML = trendText.innerHTML.replace(/\n/g, "<br>");
      trendSection.appendChild(trendHeader);
      trendSection.appendChild(trendText);

      // Correction section=======================================
      const correctionSection = document.createElement("section");
      correctionSection.setAttribute("id", "correctionSection");
      correctionSection.setAttribute("class", "notes-section");
      const correctionHeader = document.createElement("h3");
      correctionHeader.textContent = "Correction";
      const correctionText = document.createElement("p");
      correctionText.setAttribute("id", "correctiontext");
      correctionText.textContent = record[key]["CORRECTION_TEXT"];
      correctionText.innerHTML = correctionText.innerHTML.replace(
        /\n/g,
        "<br>",
      );
      const correctionDate = document.createElement("p");
      // correctionDate.setAttribute('class', 'tbl');
      correctionDate.setAttribute("class", "actiondate");
      if (record[key]["CORRECTION_DATE"]) {
        correctionDate.innerHTML =
          "Correction Date:" +
          " " +
          record[key]["CORRECTION_DATE"].substring(0, 10);
      } else {
        correctionDate.innerHTML = "Correction Date:" + " " + "";
      }
      const actionby = document.createElement("p");
      actionby.setAttribute("id", "actioner");
      let dbActioner = record[key]["ACTION_BY"];
      if (dbActioner === null) {
        dbActioner = "";
      } else {
        dbActioner = dbActioner.toUpperCase();
      }
      actionby.textContent = "Action By:" + " " + dbActioner;

      const btnCorrection = document.createElement("button");
      btnCorrection.setAttribute("id", "btnCorrection");
      btnCorrection.setAttribute("class", "btnEditNotes");
      btnCorrection.textContent = "Edit";
      btnCorrection.addEventListener("click", (e) => {
        e.preventDefault();
        // load values to the form
        let actioner = record[key]["ACTION_BY"];
        if (actioner === null) {
          actioner = "";
        } else {
          actioner = actioner.toUpperCase();
        }
        document.getElementById("actionby").value = actioner;
        document.getElementById("correctiontext").value =
          record[key]["CORRECTION_TEXT"];
        document.getElementById("correctiondate").value =
          record[key]["CORRECTION_DATE"];
        // show the dialog
        document.getElementById("correctionDialog").showModal();

        // Attach save handler only once
        const correctionSaveBtn = document.getElementById("correctionSave");
        if (!correctionSaveBtn.dataset.listener) {
          correctionSaveBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            let newactioner = document.getElementById("actionby").value;
            newactioner = newactioner ? newactioner.toUpperCase() : "";
            let correctiontext =
              document.getElementById("correctiontext").value;
            let newcorrectiontext = document.getElementById(
              "new-correction-text",
            ).value;
            let formatteddate = new Date()
              .toISOString()
              .replace("T", " ")
              .substring(0, 19);
            newcorrectiontext =
              user + " - " + formatteddate + "\n " + newcorrectiontext + "\n";
            let concatText =
              !correctiontext || correctiontext === ""
                ? newcorrectiontext
                : newcorrectiontext + "\n" + correctiontext;
            let correctiondate =
              document.getElementById("correctiondate").value;
            let url = `${apiUrl}/corrective/${caid}`;
            await fetch(url, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                CORRECTION_DATE: correctiondate,
                CORRECTION_TEXT: concatText,
                ACTION_BY: newactioner,
                MODIFIED_BY: user,
              }),
            });
            document.getElementById("correctionDialog").close();
            await updateAfterSave();
          });
          correctionSaveBtn.dataset.listener = "true";
        }
      });
      // Create a grid container for the correction header and button
      const correctionHeaderGrid = document.createElement("div");
      correctionHeaderGrid.setAttribute("class", "section-header-grid");

      // Add header and button to the grid
      correctionHeaderGrid.appendChild(correctionHeader);
      correctionHeaderGrid.appendChild(btnCorrection);

      // Create container for correction content
      const correctionContent = document.createElement("div");
      correctionContent.setAttribute("class", "section-content");
      correctionContent.appendChild(correctionDate);
      correctionContent.appendChild(actionby);
      correctionContent.appendChild(correctionText);

      // Append to correction section
      correctionSection.appendChild(correctionHeaderGrid);
      correctionSection.appendChild(correctionContent);

      // Cause section=======================================
      const causeSection = document.createElement("section");
      causeSection.setAttribute("id", "causeSection");
      causeSection.setAttribute("class", "notes-section");
      const causeHeader = document.createElement("h3");
      causeHeader.textContent = "Cause";
      const causeText = document.createElement("p");
      causeText.setAttribute("id", "causetext");
      causeText.textContent = record[key]["CAUSE_TEXT"];
      causeText.innerHTML = causeText.innerHTML.replace(/\n/g, "<br>");
      const btnCause = document.createElement("button");
      btnCause.setAttribute("id", "btnCause");
      btnCause.setAttribute("class", "btnEditNotes");
      btnCause.textContent = "Edit";

      btnCause.addEventListener("click", (e) => {
        e.preventDefault();
        // load values to the form
        document.getElementById("causetext").value = record[key]["CAUSE_TEXT"];
        // show the dialog
        document.getElementById("causeDialog").showModal();

        // save the changes
        document
          .getElementById("causeSave")
          .addEventListener("click", async (e) => {
            e.preventDefault();
            // get the values from the form
            let causetext = document.getElementById("causetext").value;
            let newcausetext = document.getElementById("new-cause-text").value;
            let formatteddate = new Date().toISOString();
            formatteddate = formatteddate.replace("T", " ").substring(0, 19);
            // replace the colon
            // formatteddate = formatteddate.replace(':', '');
            newcausetext =
              user + " - " + formatteddate + "\n " + newcausetext + "\n";
            let concatText = "";
            // if causetext is empty, just use the newcausetext
            if (causetext === "" || causetext === null) {
              concatText = newcausetext;
            } else {
              concatText = newcausetext + "\n" + causetext;
              // console.log(concatText);
            }
            // let causetext = document.getElementById('causetext').value;
            // let causeDate = document.getElementById('causedate').value;
            let causeDate = new Date().toISOString().slice(0, 10);
            // update the record
            let url = `${apiUrl}/corrective/${caid}`;
            await fetch(url, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                CAUSE_DATE: causeDate, //the date is not being updated - placeholder for uniform route
                CAUSE_TEXT: concatText,
              }),
            });
            // close the dialog
            document.getElementById("causeDialog").close();
            await updateAfterSave();
          });
      });

      // Create a grid container for the cause header and button
      const causeHeaderGrid = document.createElement("div");
      causeHeaderGrid.setAttribute("class", "section-header-grid");

      // Add header and button to the grid
      causeHeaderGrid.appendChild(causeHeader);
      causeHeaderGrid.appendChild(btnCause);

      // Create container for cause content
      const causeContent = document.createElement("div");
      causeContent.setAttribute("class", "section-content");
      causeContent.appendChild(causeText);

      // Add child elements to the cause section
      causeSection.appendChild(causeHeaderGrid);
      causeSection.appendChild(causeContent);

      // Control section=======================================
      const controlSection = document.createElement("section");
      controlSection.setAttribute("id", "controlSection");
      controlSection.setAttribute("class", "notes-section");
      const controlHeader = document.createElement("h3");
      controlHeader.textContent = "Systemic Remedy";
      const controlText = document.createElement("p");
      controlText.setAttribute("id", "controltext");
      controlText.textContent = record[key]["CONTROL_TEXT"];
      controlText.innerHTML = controlText.innerHTML.replace(/\n/g, "<br>");
      const controlDate = document.createElement("p");
      controlDate.setAttribute("class", "actiondate2");
      if (record[key]["CORR_ACTION_DATE"]) {
        controlDate.innerHTML =
          "Systemic Date:" +
          " " +
          record[key]["CORR_ACTION_DATE"].substring(0, 10);
      } else {
        controlDate.innerHTML = "Systemic Date:" + " " + "";
      }
      const btnControl = document.createElement("button");
      btnControl.setAttribute("id", "btnControl");
      btnControl.setAttribute("class", "btnEditNotes");
      btnControl.textContent = "Edit";

      btnControl.addEventListener("click", (e) => {
        e.preventDefault();
        // load values to the form
        document.getElementById("controltext").value =
          record[key]["CONTROL_TEXT"];
        // show the dialog
        document.getElementById("controlDialog").showModal();

        // save the changes
        document
          .getElementById("controlSave")
          .addEventListener("click", async (e) => {
            e.preventDefault();
            // get the values from the form
            let controltext = document.getElementById("controltext").value;
            let newcontroltext =
              document.getElementById("new-control-text").value;
            let formatteddate = new Date().toISOString();
            formatteddate = formatteddate.replace("T", " ").substring(0, 19);
            // replace the colon
            // formatteddate = formatteddate.replace(':', '');
            newcontroltext =
              user + " - " + formatteddate + "\n " + newcontroltext + "\n";
            let concatText = "";
            // if controltext is empty, just use the newcontroltext
            if (controltext === "" || controltext === null) {
              concatText = newcontroltext;
            } else {
              concatText = newcontroltext + "\n" + controltext;
              // console.log(concatText);
            }
            // let controltext = document.getElementById('controltext').value;
            // let controlDate = document.getElementById('controldate').value;
            let controlDate = new Date().toISOString().slice(0, 10);
            // update the record
            let url = `${apiUrl}/corrective/${caid}`;
            await fetch(url, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                CORR_ACTION_DATE: controlDate,
                CONTROL_TEXT: concatText,
              }),
            });
            // close the dialog
            document.getElementById("controlDialog").close();
            await updateAfterSave();
          });
      });

      // Create a grid container for the control header and button
      const controlHeaderGrid = document.createElement("div");
      controlHeaderGrid.setAttribute("class", "section-header-grid");

      // Add header and button to the grid
      controlHeaderGrid.appendChild(controlHeader);
      controlHeaderGrid.appendChild(btnControl);

      // Create container for control content
      const controlContent = document.createElement("div");
      controlContent.setAttribute("class", "section-content");
      controlContent.appendChild(controlDate);
      controlContent.appendChild(controlText);

      // Add child elements to the control section
      controlSection.appendChild(controlHeaderGrid);
      controlSection.appendChild(controlContent);

      // Append the elements to the main element================
      main.appendChild(mainTitle);
      main.appendChild(divSubTitle);
      main.appendChild(detailSection);
      main.appendChild(trendSection);
      main.appendChild(correctionSection);
      main.appendChild(causeSection);
      main.appendChild(controlSection);

      // Add escalation history
      const escalationHistory = await createEscalationHistory(
        "CORRECTIVE",
        record[key]["CORRECTIVE_ID"],
      );
      main.appendChild(escalationHistory);
    }
  });
