import {
  loadHeaderFooter,
  getUserValue,
  getDateTime,
  getcodedesc,
  myport,
} from "./utils.mjs";
loadHeaderFooter();

// get user value
const user = await getUserValue();
const port = myport();

// get url parameters
const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get("id");

const url = `http://localhost:${port}/manager/${id}`;
const managerUrl = `http://localhost:${port}/manager/`;
const checklistUrl = `http://localhost:${port}/checklist/`;
// console.log(url);

const main = document.querySelector("main");

while (main.firstChild) {
  main.removeChild(main.firstChild);
}

fetch(url, { method: "GET" })
  .then((response) => response.json())
  .then((record) => {
    // console.log(record);

    // Create main title with close button
    const h1 = document.createElement("h1");
    h1.textContent = "Audit Manager";

    const btnClose = document.createElement("button");
    btnClose.textContent = "Close";
    btnClose.classList.add("btn");
    btnClose.classList.add("btn-primary");
    btnClose.id = "btnClose";

    const divMainTitle = document.createElement("div");
    divMainTitle.classList.add("main-title");
    divMainTitle.appendChild(h1);
    divMainTitle.appendChild(btnClose);

    main.appendChild(divMainTitle);

    // Detail header div
    const divDetailHeader = document.createElement("div");
    divDetailHeader.classList.add("detailheader");

    // Details
    const section = document.createElement("section");
    section.classList.add("details");
    const h2 = document.createElement("h2");
    h2.textContent = "Details";

    // Create a div for h2 and edit button
    const divTitleAndEdit = document.createElement("div");
    divTitleAndEdit.classList.add("title-and-edit");
    divTitleAndEdit.appendChild(h2);

    // add button to section
    const btneditdetail = document.createElement("button");
    btneditdetail.textContent = "Edit";
    btneditdetail.classList.add("btn");
    btneditdetail.classList.add("btn-primary");
    btneditdetail.id = "btnEditDetail";

    // Add edit button to the title div
    divTitleAndEdit.appendChild(btneditdetail);

    const divDetailBtns = document.createElement("div");
    divDetailBtns.classList.add("detailbtns");
    divDetailBtns.appendChild(divTitleAndEdit);

    // divDetailHeader.appendChild(h2);
    divDetailHeader.appendChild(divDetailBtns);
    // divDetailHeader.appendChild(btnClose);
    section.appendChild(divDetailHeader);

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
    for (const key in record[0]) {
      if (!fieldList.includes(key)) {
        continue;
      }
      let amid = record[0].AUDIT_MANAGER_ID;
      const p = document.createElement("p");
      p.textContent = key.replace(/_/g, " ") + ": " + record[0][key];

      // if the last 4 =='DATE' then format the date
      if (key.slice(-4) == "DATE") {
        // if its the completion date and its null then set it to zls
        if (key == "COMPLETION_DATE" && record[0][key] == null) {
          p.textContent = key.replace(/_/g, " ") + ": ";
        } else {
          p.textContent =
            key + ": " + new Date(record[0][key]).toLocaleDateString();
        }
      }

      if (key == "AUDIT_ID") {
        p.textContent = key.replace(/_/g, " ") + ": " + record[0][key];
        p.setAttribute("id", "audit_id");
      }

      section.appendChild(p);
    }
    main.appendChild(section);

    // Checklist
    const sectionChecklist = document.createElement("section");
    sectionChecklist.classList.add("checklist");
    const h3 = document.createElement("h3");
    h3.textContent = "Checklist";
    sectionChecklist.appendChild(h3);
    main.appendChild(sectionChecklist);

    // Checklist button
    const btnChecklist = document.createElement("button");
    btnChecklist.textContent = "Add Checklist";
    btnChecklist.classList.add("btn");
    btnChecklist.classList.add("btn-primary");
    btnChecklist.id = "btnAddQust";
    sectionChecklist.appendChild(btnChecklist);

    fetch(checklistUrl + id, { method: "GET" })
      .then((response) => response.json())
      .then((records) => {
        // console.log(records);

        let checklistFields = [
          "CHECKLIST_ID",
          "QUESTION",
          "OBSERVATION",
          "REFERENCE",
        ];

        for (const row in records) {
          // console.log(records[row]);
          // for every row we want a div
          const rowdiv = document.createElement("div");
          rowdiv.classList.add("rowdiv");

          for (const key in records[row]) {
            // console.log(key);
            if (checklistFields.includes(key)) {
              const divcklst = document.createElement("div");
              // console.log(key);
              switch (key) {
                case "CHECKLIST_ID":
                  const pcklst = document.createElement("p");
                  pcklst.id = "checklist_id";
                  pcklst.classList.add("chkdet");
                  pcklst.textContent = "Checklist Id: " + records[row][key];
                  rowdiv.appendChild(pcklst);
                  break;
                case "STANDARD":
                  const scklst = document.createElement("p");
                  scklst.id = "standard";
                  scklst.classList.add("chkdet");
                  scklst.textContent = "Standard: " + records[row][key];
                  rowdiv.appendChild(scklst);
                  break;
                case "QUESTION":
                  const qcklst = document.createElement("p");
                  qcklst.id = "question";
                  qcklst.textContent = key + ": " + records[row][key];
                  rowdiv.appendChild(qcklst);
                  break;
                case "OBSERVATION":
                  const ocklst = document.createElement("div");
                  ocklst.classList.add("observations");
                  const obs = document.createElement("p");
                  obs.id = "observation";
                  // Set to zls if null
                  if (records[row][key] == null) {
                    records[row][key] = "";
                  }
                  obs.textContent = key + ": " + records[row][key];
                  // create a button to edit the observation
                  const btnEditObs = document.createElement("button");
                  // btnEditObs.textContent = "Observation: " + records[row].CHECKLIST_ID;
                  btnEditObs.textContent = "Observation";
                  btnEditObs.classList.add("btn");
                  btnEditObs.classList.add("btn-primary");
                  btnEditObs.classList.add("btnEditObs");
                  // Set the custom attribute to the checklist id
                  btnEditObs.setAttribute(
                    "data-checklist-id",
                    records[row].CHECKLIST_ID
                  );

                  // rowdiv.appendChild(btnEditObs);
                  ocklst.appendChild(obs);
                  ocklst.appendChild(btnEditObs);
                  rowdiv.appendChild(ocklst);
                  break;
                case "REFERENCE":
                  const rcklst = document.createElement("p");
                  rcklst.id = "reference";
                  rcklst.classList.add("chkdet");
                  // Set to zls if null
                  if (records[row][key] == null) {
                    records[row][key] = "";
                  }
                  rcklst.textContent = "Ref." + ": " + records[row][key];
                  rowdiv.appendChild(rcklst);
                  break;
                default:
                  // break;
                  continue;
              }

              // console.log(divcklst);
              divcklst.textContent = key + ": " + records[row][key];
              // divChecklistRow.appendChild(divcklst);
            }
          }
          sectionChecklist.appendChild(rowdiv);
        }
      });
    main.appendChild(sectionChecklist);

    const btnAddQust = document.getElementById("btnAddQust");
    btnAddQust.addEventListener("click", async (e) => {
      // prevent default
      e.preventDefault();
      // get the dialog from the html
      const addQdialog = document.querySelector("#addquestion");
      // show the dialog
      addQdialog.showModal();

      // listen for the savenewquestion button
      const btnSaveNewQuestion = document.getElementById("savenewquestion");
      btnSaveNewQuestion.addEventListener("click", async (e) => {
        // prevent default
        e.preventDefault();
        // get the AUDIT_MANAGER_ID from the url parameter
        const auditManagerId = urlParams.get("id");
        // get the checklist id
        // console.log(checklistUrl + "nextChecklist/" + auditManagerId);
        const checklistId = fetch(
          checklistUrl + "nextChecklist/" + auditManagerId,
          { method: "GET" }
        )
          .then((response) => response.json())
          .then((data) => {
            // convert data to string and return
            // return JSON.stringify(data);
            return data;
          });

        // if reference is blank pull first line of question if starts with AS9100
        if (document.getElementById("newreference").value == "") {
          const newQuestion = document.getElementById("newquestion").value;
          if (newQuestion.startsWith("AS9100")) {
            document.getElementById("newreference").value =
              newQuestion.split("\n")[0];
            // set the new question to the rest of the question
            document.getElementById("newquestion").value = newQuestion
              .split("\n")
              .slice(1)
              .join("\n");
          }
        }

        // get the dialog from the html
        const addQdialog = document.querySelector("#addquestion");
        // get the values from the form
        const newQuestion = document.getElementById("newquestion").value;
        // const newStandard = document.getElementById('newstandard').value;
        const newReference = document.getElementById("newreference").value;
        // console.log(newQuestion, newObservation, newReference);
        // create the new record
        const newRecord = {
          AUDIT_MANAGER_ID: auditManagerId,
          CHECKLIST_ID: (await checklistId).toString().padStart(7, "0"),
          QUESTION: newQuestion,
          REFERENCE: newReference,
        };
        // console.log(newRecord);

        // post the new record
        fetch(checklistUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newRecord),
        })
          .then((response) => response.json())
          .then((data) => {
            // console.log(data);
            // close the dialog
            addQdialog.close();
            // reload the page
            window.location.reload();
          });
      });
    });

    // listen for btneditdetail click, open dialog, populate fields
    const btnEditDetail = document.getElementById("btnEditDetail");
    btnEditDetail.addEventListener("click", async (e) => {
      // prevent default
      e.preventDefault();
      // get the dialog from the html
      const editdialog = document.getElementById("editaudit");
      // show the dialog
      editdialog.showModal();
      // get the values from the form
      document.getElementById("standard").value = record[0].STANDARD;
      document.getElementById("subject").value = record[0].SUBJECT;
      document.getElementById("scheddate").value = new Date(
        record[0].SCHEDULED_DATE
      )
        .toISOString()
        .split("T")[0];
      document.getElementById("leadauditor").value = record[0].LEAD_AUDITOR;
      document.getElementById("auditee").value = record[0].AUDITEE1;
    });

    // listen for save button click
    const btnSave = document.getElementById("saveaudit");
    btnSave.addEventListener("click", async (e) => {
      // prevent default
      e.preventDefault();
      // get the dialog from the html
      const editdialog = document.getElementById("editaudit");
      // get the values from the form
      const editStandard = document.getElementById("standard").value;
      const editSubject = document.getElementById("subject").value;
      const editScheduledDate = document.getElementById("scheddate").value;
      // change the following to uppercase
      const editLeadAuditor = document
        .getElementById("leadauditor")
        .value.toUpperCase();
      const editAuditee1 = document
        .getElementById("auditee")
        .value.toUpperCase();
      // create the record
      const editRecord = {
        STANDARD: editStandard,
        SUBJECT: editSubject,
        SCHEDULED_DATE: editScheduledDate,
        LEAD_AUDITOR: editLeadAuditor,
        AUDITEE1: editAuditee1,
      };
      // console.log(editRecord);

      // put the edits
      fetch(managerUrl + id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editRecord),
      })
        .then((response) => response.json())
        .then((data) => {
          // console.log(data);
          // close the dialog
          editdialog.close();
          // reload the page
          window.location.reload();
        });
    });

    btnClose.addEventListener("click", async (e) => {
      // prevent default
      e.preventDefault();
      // close URL
      let closeUrl = `http://localhost:${port}/manager/completed`;
      // create the record
      const closeRecord = {
        AUDIT_MANAGER_ID: record[0].AUDIT_MANAGER_ID,
        COMPLETION_DATE: getDateTime(),
      };

      // put the edits
      fetch(closeUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(closeRecord),
      })
        .then((response) => response.json())
        .then((data) => {
          // reload the page
          window.location.reload();
        });
      // alert to send results email
      alert("Send results email to auditee");
    });

    // listen for btnEditObs click, open dialog, populate fields, associate checklist id
    // const btnEditObs = document.querySelectorAll(".btnEditObs");
    document.addEventListener("click", async (e) => {
      // check if the button clicked is the btnEditObs
      if (e.target.classList.contains("btnEditObs")) {
        // get the checklist id from the custom attribute
        const checklistId = e.target.getAttribute("data-checklist-id");
        // console.log(checklistId);
        // get the dialog from the html
        const editObsDialog = document.querySelector("#editobservation");
        // show the dialog
        editObsDialog.showModal();
        // set the value after the dialog is shown
        document.getElementById("obsid").textContent = checklistId;
      }

      // listen for the saveobservation button
      const btnSaveNewObservation = document.getElementById("saveobservation");
      btnSaveNewObservation.addEventListener("click", async (e) => {
        // prevent default
        e.preventDefault();
        // get the checklist id
        let checklistId = document.getElementById("obsid").textContent;
        // prepend with 0's to make 7 digits
        checklistId = checklistId.padStart(7, "0");
        // get the dialog from the html
        const addObsDialog = document.querySelector("#editobservation");
        // get the values from the form
        let newObservation = document.getElementById("newobservation").value;
        // create the new record
        const newRecord = {
          AUDIT_MANAGER_ID: id,
          CHECKLIST_ID: checklistId,
          OBSERVATION: newObservation,
        };
        console.log(newRecord);

        // post the new record
        fetch(checklistUrl + "/obsn", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newRecord),
        })
          .then((response) => response.json())
          .then((data) => {
            // console.log(data);
            // clear the form
            document.getElementById("obsid").textContent = "";
            document.getElementById("newobservation").value = "";
            // close the dialog
            addObsDialog.close();
            // reload the page
            window.location.reload();
          });
      });
    });
  });
