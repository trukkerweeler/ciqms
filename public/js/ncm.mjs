import {
  loadHeaderFooter,
  getUserValue,
  myport,
  getDateTime,
} from "./utils.mjs";
loadHeaderFooter();
const port = myport() || 3003;
const user = await getUserValue();
const test = false;

if (test) {
  // console.log('ncm.mjs');
  console.log(user);
}

// Get the project id from the url params
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let iid = urlParams.get("id");

if (test) {
  console.log(iid);
}

const url = `http://localhost:${port}/ncm/${iid}`;

// Function to fetch subjects from the server
async function fetchSubjects() {
  try {
    const subjectsUrl = `http://localhost:${port}/ncm/subjects`;
    const response = await fetch(subjectsUrl, { method: "GET" });
    const subjects = await response.json();
    return subjects;
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return [];
  }
}

async function fetchCauses() {
  try {
    const causesUrl = `http://localhost:${port}/causemaint/`;
    const response = await fetch(causesUrl, { method: "GET" });
    const causes = await response.json();
    return causes;
  } catch (error) {
    console.error("Error fetching causes:", error);
    return [];
  }
}

const main = document.querySelector("main");
// Delete the child nodes of the main element
while (main.firstChild) {
  main.removeChild(main.firstChild);
}

// // enable the close button
// closebutton.disabled = false;

fetch(url, { method: "GET" })
  .then((response) => response.json())
  .then((record) => {
    // console.log(record);
    for (const key in record) {
      const detailSection = document.createElement("section");
      detailSection.setAttribute("class", "section");
      detailSection.setAttribute("id", "detailSection");
      const elemRpt = document.createElement("h1");
      const elemId = document.createElement("h2");
      const detailHeading = document.createElement("h3");
      detailHeading.setAttribute("id", "detailTitle");
      detailHeading.textContent = "Detail";

      const divDetailBtns = document.createElement("div");
      divDetailBtns.setAttribute("class", "detailButtons");
      divDetailBtns.setAttribute("id", "detailButtons");

      const btnEditDetail = document.createElement("button");
      btnEditDetail.setAttribute("class", "btn");
      btnEditDetail.setAttribute("class", "btnEditNotes");
      btnEditDetail.textContent = "Edit Detail";
      btnEditDetail.setAttribute("id", "btnEditDetail");
      btnEditDetail.setAttribute("type", "submit");

      // divDetailBtns.appendChild(btnClose);
      divDetailBtns.appendChild(btnEditDetail);

      const ncmDate = document.createElement("p");
      ncmDate.textContent =
        "Request Date:" + " " + record[key]["NCM_DATE"].substring(0, 10);
      ncmDate.setAttribute("class", "tbl");

      const aiClosedDate = document.createElement("p");
      if (
        record[key]["CLOSED_DATE"] === null ||
        record[key]["CLOSED_DATE"] === "" ||
        record[key]["CLOSED_DATE"].length === 0
      ) {
        aiClosedDate.textContent = "Closed Date:" + " " + "";
        if (test) {
          console.log("closed date is null");
        }
      } else {
        aiClosedDate.textContent =
          "Closed Date:" + " " + record[key]["CLOSED_DATE"].substring(0, 10);

        if (test) {
          console.log("closed date is NOT null");
          // print button status
          // console.log(btnClose.disabled);
        }
      }

      aiClosedDate.setAttribute("class", "tbl");

      const caAssTo = document.createElement("p");
      caAssTo.textContent = "Assigned To:" + " " + record[key]["ASSIGNED_TO"];
      caAssTo.setAttribute("class", "tbl");
      const reqBy = document.createElement("p");
      reqBy.textContent = "Request By:" + " " + record[key]["PEOPLE_ID"];
      reqBy.setAttribute("class", "tbl");

      const due_date = document.createElement("p");
      if (record[key]["DUE_DATE"] === null) {
        due_date.textContent = "Due date:" + " " + "";
      } else
        due_date.textContent =
          "Due date:" + " " + record[key]["DUE_DATE"].substring(0, 10);
      due_date.setAttribute("class", "tbl");

      const ncmType = document.createElement("p");
      ncmType.textContent = "Type:" + " " + record[key]["NCM_TYPE"];
      ncmType.setAttribute("class", "tbl");

      const subject = document.createElement("p");
      subject.setAttribute("class", "tbl");
      if (
        record[key]["SUBJECT"] === null ||
        record[key]["SUBJECT"] === "" ||
        record[key]["SUBJECT"] === undefined
      ) {
        subject.textContent = "Subject:" + " --";
      } else {
        subject.textContent = "Subject:" + " " + record[key]["SUBJECT"];
      }

      const cause = document.createElement("p");
      cause.setAttribute("class", "tbl");
      if (
        record[key]["CAUSE"] === null ||
        record[key]["CAUSE"] === "" ||
        record[key]["CAUSE"] === undefined
      ) {
        cause.textContent = "Cause:" + " --";
      } else {
        cause.textContent = "Cause:" + " " + record[key]["CAUSE"];
      }

      const productId = document.createElement("p");
      productId.setAttribute("class", "tbl");
      if (
        record[key]["PRODUCT_ID"] === null ||
        record[key]["PRODUCT_ID"] === "" ||
        record[key]["PRODUCT_ID"] === undefined
      ) {
        productId.textContent = "Product Id:" + "--";
      } else {
        productId.textContent = "Product Id:" + " " + record[key]["PRODUCT_ID"];
      }

      const lotNumber = document.createElement("p");
      lotNumber.setAttribute("class", "tbl");
      lotNumber.setAttribute("id", "lotNumber");
      if (
        record[key]["LOT_NUMBER"] === null ||
        record[key]["LOT_NUMBER"] === "" ||
        record[key]["LOT_NUMBER"] === undefined
      ) {
        lotNumber.textContent = "Lot Number:" + "--";
      } else {
        lotNumber.textContent = "Lot Number:" + " " + record[key]["LOT_NUMBER"];
      }

      const lotQty = document.createElement("p");
      lotQty.setAttribute("class", "tbl");
      lotQty.setAttribute("id", "lotQty");
      if (
        record[key]["LOT_SIZE"] === null ||
        record[key]["LOT_SIZE"] === "" ||
        record[key]["LOT_SIZE"] === undefined
      ) {
        lotQty.textContent = "Lot Qty:" + "";
      } else {
        lotQty.textContent = "Lot Qty:" + " " + record[key]["LOT_SIZE"];
      }

      const rmaId = document.createElement("p");
      rmaId.textContent = "RMA Id:" + " " + record[key]["USER_DEFINED_1"];
      rmaId.setAttribute("class", "tbl");
      if (
        record[key]["USER_DEFINED_1"] === null ||
        record[key]["USER_DEFINED_1"] === "" ||
        record[key]["USER_DEFINED_1"] === undefined
      ) {
        rmaId.textContent = "RMA Id:" + "--";
      } else {
        rmaId.textContent = "RMA Id:" + " " + record[key]["USER_DEFINED_1"];
      }

      const po_number = document.createElement("p");
      po_number.textContent = "PO Number:" + " " + record[key]["PO_NUMBER"];
      po_number.setAttribute("class", "tbl");
      if (
        record[key]["PO_NUMBER"] === null ||
        record[key]["PO_NUMBER"] === "" ||
        record[key]["PO_NUMBER"] === undefined
      ) {
        po_number.textContent = "PO:" + "--";
      } else {
        po_number.textContent = "PO:" + " " + record[key]["PO_NUMBER"];
      }

      const notesSection = document.createElement("section");
      notesSection.setAttribute("class", "notesgrid");
      notesSection.setAttribute("id", "notesSection");

      const ncDescTitle = document.createElement("h3");
      ncDescTitle.setAttribute("class", "header3");
      ncDescTitle.setAttribute("id", "trendTitle");

      const btnEditDesc = document.createElement("button");
      btnEditDesc.setAttribute("class", "btn");
      btnEditDesc.setAttribute("class", "btnEditNotes");
      btnEditDesc.setAttribute("id", "btnEditDesc");
      btnEditDesc.setAttribute("type", "submit");
      btnEditDesc.textContent = "Edit Desc.";

      const dispositionTitle = document.createElement("h3");
      dispositionTitle.setAttribute("class", "header3");

      const btnEditDisposition = document.createElement("button");
      btnEditDisposition.setAttribute("class", "btn");
      btnEditDisposition.setAttribute("class", "btnEditNotes");
      btnEditDisposition.setAttribute("id", "btnEditDisp");
      btnEditDisposition.textContent = "Edit Disp.";

      const verificationTitle = document.createElement("h3");
      verificationTitle.setAttribute("class", "header3");

      const btnEditVerf = document.createElement("button");
      btnEditVerf.setAttribute("class", "btn");
      btnEditVerf.setAttribute("class", "btnEditNotes");
      btnEditVerf.setAttribute("id", "btnEditVerf");
      btnEditVerf.textContent = "Edit Verf.";

      const notesTitle = document.createElement("h3");
      notesTitle.setAttribute("class", "header3");

      const btnEditNote = document.createElement("button");
      btnEditNote.setAttribute("class", "btn");
      btnEditNote.setAttribute("class", "btnEditNotes");
      btnEditNote.setAttribute("id", "btnEditNote");
      btnEditNote.textContent = "Edit Notes";

      const linebreak = document.createElement("br");

      elemRpt.textContent = "Nonconformance Detail";
      elemRpt.setAttribute("class", "header");

      // make a div for the subtitle and add the subtitle to the div and a button
      const divSubTitle = document.createElement("div");
      divSubTitle.setAttribute("class", "subtitlewithbutton");

      // Add title to the div
      elemId.textContent = "NCM Id: " + record[key]["NCM_ID"];
      elemId.setAttribute("class", "header2");
      elemId.setAttribute("id", "nid");
      divSubTitle.appendChild(elemId);

      // Add close button to the div
      const btnClose = document.createElement("button");
      btnClose.setAttribute("class", "btn");
      // btnClose.setAttribute('class', 'btnEditNotes');
      btnClose.textContent = "Close NCM";
      btnClose.setAttribute("id", "btnCloseNCM");
      btnClose.setAttribute("type", "submit");

      // disable the close button
      if (user === "TKENT") {
        btnClose.disabled = false;
      } else {
        btnClose.disabled = true;
      }

      divSubTitle.appendChild(btnClose);

      const empty = document.createElement("p");

      detailSection.appendChild(detailHeading);
      detailSection.appendChild(divDetailBtns);
      detailSection.appendChild(empty);
      detailSection.appendChild(productId);
      detailSection.appendChild(ncmDate);
      detailSection.appendChild(caAssTo);
      detailSection.appendChild(aiClosedDate);
      detailSection.appendChild(reqBy);
      detailSection.appendChild(due_date);
      detailSection.appendChild(ncmType);
      detailSection.appendChild(subject);
      detailSection.appendChild(cause);
      detailSection.appendChild(lotNumber);
      detailSection.appendChild(lotQty);
      detailSection.appendChild(rmaId);
      detailSection.appendChild(po_number);

      const divDesc = document.createElement("div");
      divDesc.setAttribute("class", "notes");

      // Create a grid container for this section
      const descSectionGrid = document.createElement("div");
      descSectionGrid.setAttribute("class", "section-grid");

      // Create title text span
      const titleTextSpan = document.createElement("span");
      titleTextSpan.setAttribute("class", "title-text");
      titleTextSpan.textContent = "Description:";

      // Add all three elements to the grid: title, button, content
      descSectionGrid.appendChild(titleTextSpan);
      descSectionGrid.appendChild(btnEditDesc);
      descSectionGrid.appendChild(divDesc);

      divDesc.textContent = record[key]["DESCRIPTION"];
      divDesc.setAttribute("id", "inputtext");
      divDesc.innerHTML = divDesc.innerHTML.replace(/\n/g, "<br>");
      notesSection.appendChild(descSectionGrid);

      const divDisposition = document.createElement("div");
      divDisposition.setAttribute("class", "disposition");
      divDisposition.setAttribute("class", "notes");
      divDisposition.setAttribute("id", "disptext");

      // Create a grid container for this section
      const dispSectionGrid = document.createElement("div");
      dispSectionGrid.setAttribute("class", "section-grid");

      // Create title text span
      const dispTitleTextSpan = document.createElement("span");
      dispTitleTextSpan.setAttribute("class", "title-text");
      dispTitleTextSpan.textContent = "Disposition:";

      dispositionTitle.setAttribute("id", "dispTitle");
      if (
        record[key]["DISPOSITION"] === null ||
        record[key]["DISPOSITION"] === "" ||
        record[key]["DISPOSITION"] === undefined
      ) {
        divDisposition.innerHTML = "<br>";
      } else {
        divDisposition.textContent = record[key]["DISPOSITION"];
        divDisposition.innerHTML = divDisposition.innerHTML.replace(
          /\n/g,
          "<br>"
        );
      }

      // Add all three elements to the grid: title, button, content
      dispSectionGrid.appendChild(dispTitleTextSpan);
      dispSectionGrid.appendChild(btnEditDisposition);
      dispSectionGrid.appendChild(divDisposition);
      notesSection.appendChild(dispSectionGrid);

      const divVerification = document.createElement("div");
      divVerification.setAttribute("class", "verification");
      divVerification.setAttribute("class", "notes");
      divVerification.setAttribute("id", "verftext");

      // Create a grid container for this section
      const verfSectionGrid = document.createElement("div");
      verfSectionGrid.setAttribute("class", "section-grid");

      // Create title text span
      const verfTitleTextSpan = document.createElement("span");
      verfTitleTextSpan.setAttribute("class", "title-text");
      verfTitleTextSpan.textContent = "Verification:";

      verificationTitle.setAttribute("id", "verificationTitle");
      divVerification.innerHTML = divVerification.innerHTML.replace(
        /\n/g,
        "<br>"
      );
      if (
        record[key]["VERIFICATION"] === null ||
        record[key]["VERIFICATION"] === "" ||
        record[key]["VERIFICATION"] === undefined
      ) {
        divVerification.innerHTML = "<br>";
      } else {
        divVerification.textContent = record[key]["VERIFICATION"];
        divVerification.innerHTML = divVerification.innerHTML.replace(
          /\n/g,
          "<br>"
        );
      }

      // Add all three elements to the grid: title, button, content
      verfSectionGrid.appendChild(verfTitleTextSpan);
      verfSectionGrid.appendChild(btnEditVerf);
      verfSectionGrid.appendChild(divVerification);
      notesSection.appendChild(verfSectionGrid);

      const divNcmNotes = document.createElement("div");
      divNcmNotes.setAttribute("class", "ncmnotes");
      divNcmNotes.setAttribute("class", "notes");
      divNcmNotes.setAttribute("id", "notetext");

      // Create a grid container for this section
      const notesSectionGrid = document.createElement("div");
      notesSectionGrid.setAttribute("class", "section-grid");

      // Create title text span
      const notesTitleTextSpan = document.createElement("span");
      notesTitleTextSpan.setAttribute("class", "title-text");
      notesTitleTextSpan.textContent = "Notes:";

      notesTitle.setAttribute("id", "notesTitle");
      divNcmNotes.innerHTML = divNcmNotes.innerHTML.replace(/\n/g, "<br>");
      if (
        record[key]["NCM_NOTE"] === null ||
        record[key]["NCM_NOTE"] === "" ||
        record[key]["NCM_NOTE"] === undefined
      ) {
        divNcmNotes.innerHTML = "<br>";
      } else {
        divNcmNotes.textContent = record[key]["NCM_NOTE"];
        divNcmNotes.innerHTML = divNcmNotes.innerHTML.replace(/\n/g, "<br>");
      }

      // Add all three elements to the grid: title, button, content
      notesSectionGrid.appendChild(notesTitleTextSpan);
      notesSectionGrid.appendChild(btnEditNote);
      notesSectionGrid.appendChild(divNcmNotes);
      notesSection.appendChild(notesSectionGrid);

      main.appendChild(elemRpt);
      main.appendChild(divSubTitle);
      main.appendChild(detailSection);
      main.appendChild(notesSection);
    }

    // =============================================
    // Listen for the btnEditDesc button click
    const btnEditDesc = document.querySelector("#btnEditDesc");
    btnEditDesc.addEventListener("click", async (event) => {
      // prvent the default action
      event.preventDefault();
      // show the trend dialog
      const trendDialog = document.querySelector("#trendDialog");
      trendDialog.showModal();
    });

    // Listen for the btnEditDisposition button click
    const btnEditDisposition = document.querySelector("#btnEditDisp");
    btnEditDisposition.addEventListener("click", async (event) => {
      // prvent the default action
      event.preventDefault();
      // show the trend dialog
      const dispositionDialog = document.querySelector("#dispDialog");
      dispositionDialog.showModal();
    });

    // =============================================
    // Listen for the btnEditVerf button click
    const btnEditVerf = document.querySelector("#btnEditVerf");
    btnEditVerf.addEventListener("click", async (event) => {
      // prvent the default action
      event.preventDefault();
      // show the trend dialog
      const verfDialog = document.querySelector("#verfDialog");
      verfDialog.showModal();
    });

    // =============================================
    // Listen for the btnEditNote button click
    const btnEditNote = document.querySelector("#btnEditNote");
    btnEditNote.addEventListener("click", async (event) => {
      // prvent the default action
      event.preventDefault();
      // show the trend dialog
      const noteDialog = document.querySelector("#noteDialog");
      noteDialog.showModal();
    });

    // =============================================
    // Listen for the btnEditDetail button click
    const btnEditDetail = document.querySelector("#btnEditDetail");
    btnEditDetail.addEventListener("click", async (event) => {
      // prvent the default action
      event.preventDefault();
      // show the detail dialog
      const detailDialog = document.querySelector("#detailDialog");
      detailDialog.showModal();
    });

    // =============================================
    // Listen for click on close dialog button class
    const closedialog = document.querySelectorAll(".closedialog");
    closedialog.forEach((element) => {
      element.addEventListener("click", async (event) => {
        // prevent the default action
        event.preventDefault();
        // close the dialog
        const dialog = element.closest("dialog");
        dialog.close();
      });
    });

    // // =============================================
    // // Listen for the saveNotes button class
    const saveNotes = document.querySelectorAll(".dialogSaveBtn");
    saveNotes.forEach((element) => {
      element.addEventListener("click", async (event) => {
        // prevent the default action
        event.preventDefault();
        // get the clicked button id
        // get the input id
        const nid = document.querySelector("#nid");
        let nidValue = iid;

        const fieldname = event.target.id;

        if (test) {
          console.log(fieldname);
          console.log(nidValue);
        }

        let data = {
          NCM_ID: nidValue,
          INPUT_USER: getUserValue(),
        };
        // console.log(data);

        let compositetext = "";
        const d = new Date();
        const date = d.toISOString().substring(0, 10);
        const time = d.toLocaleTimeString();
        const mydate = date + " " + time;

        switch (fieldname) {
          case "savetrend":
            // console.log('input text');
            let previoustext = document.querySelector("#inputtext").innerHTML;
            let newtextTrend = document.querySelector("#newtextTrend").value;
            // if lenght of newtextTrend is 0, do not save
            if (newtextTrend.length === 0) {
              alert("Not saving, no trend text.");
              break;
            } else {
              let compositetext =
                user +
                " - " +
                mydate +
                "<br>" +
                document.querySelector("#newtextTrend").value +
                "<br><br>" +
                previoustext;
              data = { ...data, DESCRIPTION: compositetext };
              data = { ...data, MY_TABLE: "NCM_DESCRIPTION" };
            }
            break;

          case "saveDisp":
            // console.log('followup text');
            let previoustext2 = document.querySelector("#disptext").innerHTML;
            let newtextDisp = document.querySelector("#newtextDisp").value;
            if (newtextDisp.length === 0) {
              alert("Not saving, no disposition text.");
              break;
            } else {
              let compositetext2 =
                user +
                " - " +
                mydate +
                "<br>" +
                document.querySelector("#newtextDisp").value +
                "<br><br>" +
                previoustext2;
              data = { ...data, DISPOSITION: compositetext2 };
              data = { ...data, MY_TABLE: "NCM_DISPOSITION" };
            }
            break;

          case "saveVerf":
            let previoustext3 = document.querySelector("#verftext").innerHTML;
            let newtextVerf = document.querySelector("#newtextVerf").value;
            if (newtextVerf.length === 0) {
              alert("Not saving, no verification text.");
              break;
            } else {
              let compositetext3 =
                user +
                " - " +
                mydate +
                "<br>" +
                document.querySelector("#newtextVerf").value +
                "<br><br>" +
                previoustext3;
              data = { ...data, VERIFICATION: compositetext3 };
              data = { ...data, MY_TABLE: "NCM_VERIFICATION" };
            }
            break;

          case "saveNote":
            let previoustext4 = document.querySelector("#notetext").innerHTML;
            let newtextNote = document.querySelector("#newtextNote").value;
            if (newtextNote.length === 0) {
              alert("Not saving, no note text.");
              break;
            } else {
              let compositetext4 =
                user +
                " - " +
                mydate +
                "<br>" +
                document.querySelector("#newtextNote").value +
                "<br><br>" +
                previoustext4;
              data = { ...data, NCM_NOTE: compositetext4 };
              data = { ...data, MY_TABLE: "NCM_NOTES" };
            }
            break;

          default:
            console.log("default");
        }

        if (test) {
          console.log(data);
        }

        const options = {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        };

        const response = await fetch(url, options);
        const json = await response.json();
        // searchbutton.click();
        trendDialog.close();
        // refresh the page
        window.location.reload();
      });
    });

    // =============================================
    // Listen for the editDetail button
    const editDetail = document.querySelector("#btnEditDetail");
    editDetail.addEventListener("click", async (event) => {
      const detailDialog = document.querySelector("#detailDialog");
      const editdetailform = document.querySelector("#editdetailform");
      const label = document.createElement("label");
      // prevent the default action
      event.preventDefault();

      // Fetch subjects and causes data for the dropdowns
      const subjects = await fetchSubjects();
      const causes = await fetchCauses();

      // Populate SUBJECT dropdown
      const subjectSelect = document.querySelector("#SUBJECT");
      // Clear existing options except the first one
      while (subjectSelect.children.length > 1) {
        subjectSelect.removeChild(subjectSelect.lastChild);
      }

      subjects.forEach((subject) => {
        const option = document.createElement("option");
        option.value = subject.SUBJECT;
        option.textContent = `${subject.SUBJECT} - ${subject.DESCRIPTION}`;
        subjectSelect.appendChild(option);
      });

      // Populate CAUSE dropdown
      const causeSelect = document.querySelector("#CAUSE");
      // Clear existing options except the first one
      while (causeSelect.children.length > 1) {
        causeSelect.removeChild(causeSelect.lastChild);
      }

      causes.forEach((cause) => {
        const option = document.createElement("option");
        option.value = cause.CAUSE;
        option.textContent = `${cause.CAUSE} - ${cause.DESCRIPTION}`;
        causeSelect.appendChild(option);
      });

      // Populate form fields with current record data
      for (const key in record) {
        const fields = [
          "PEOPLE_ID",
          "NCM_DATE",
          "ASSIGNED_TO",
          "DUE_DATE",
          "NCM_TYPE",
          "SUBJECT",
          "CAUSE",
          "PRODUCT_ID",
          "LOT_NUMBER",
          "LOT_SIZE",
          "USER_DEFINED_1",
          "CUSTOMER_ID",
          "SUPPLIER_ID",
        ];

        fields.forEach((fieldName) => {
          const fieldElement = document.querySelector(`#${fieldName}`);
          if (fieldElement && record[key][fieldName] !== undefined) {
            if (
              ["NCM_DATE", "DUE_DATE"].includes(fieldName) &&
              record[key][fieldName]
            ) {
              // Handle date fields
              fieldElement.value = record[key][fieldName].substring(0, 10);
            } else {
              // Handle all other fields
              fieldElement.value = record[key][fieldName] || "";
            }
          }
        });
      }

      // show the detail dialog
      detailDialog.showModal();

      // Listen for the saveDetail button click
      const saveDetail = document.querySelector("#saveDetail");
      const detailsUrl = `http://localhost:${port}/ncm/details/${iid}`;
      saveDetail.addEventListener("click", async (event) => {
        // prevent the default action
        event.preventDefault();
        // get the input id
        const nid = document.querySelector("#nid");
        let nidValue = iid;

        let data = {
          NCM_ID: nidValue,
          INPUT_USER: user,
          MODIFIED_BY: user,
          MODIFIED_DATE: getDateTime(),
        };

        // Read all form fields directly instead of relying on record object
        const fields = [
          "PEOPLE_ID",
          "NCM_DATE",
          "ASSIGNED_TO",
          "DUE_DATE",
          "NCM_TYPE",
          "SUBJECT",
          "CAUSE",
          "PRODUCT_ID",
          "LOT_NUMBER",
          "LOT_SIZE",
          "USER_DEFINED_1",
          "CUSTOMER_ID",
          "SUPPLIER_ID",
        ];

        fields.forEach((fieldName) => {
          try {
            const fieldElement = document.querySelector("#" + fieldName);
            let fieldvalue = fieldElement ? fieldElement.value : "";
            // if the field value is undefined, set it to empty string
            if (fieldvalue === undefined) {
              console.log("field value is undefined: " + fieldName);
              fieldvalue = "";
            }
            data[fieldName] = fieldvalue;
          } catch (error) {
            console.log("error reading field: " + fieldName, error);
            data[fieldName] = "";
          }
        });

        if (test) {
          console.log("=== SAVE DETAIL DATA ===");
          console.log(data);
          console.log("CAUSE field value:", data.CAUSE);
        }

        const options = {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        };

        const response = await fetch(detailsUrl, options);
        const json = await response.json();
        // searchbutton.click();
        detailDialog.close();
        // refresh the page
        window.location.reload();
      });

      // =============================================
      // Listen for the close button click
      const closebutton = document.querySelector("#btnCancelDetail");
      closebutton.addEventListener("click", async (event) => {
        // prevent the default action
        event.preventDefault();
        // close the detailDialog
        const detailDialog = document.querySelector("#detailDialog");
        detailDialog.close();
      });
    });

    // =============================================
    // Listen for the close NCM button click
    const closeNCM = document.querySelector("#btnCloseNCM");
    closeNCM.addEventListener("click", async (event) => {
      // prevent the default action
      event.preventDefault();
      // if the user is not TKENT, do not allow the close
      if (user !== "TKENT") {
        alert("Only TKENT can close the NCM");
        return;
      }
      const closeUrl = `http://localhost:${port}/ncm/close/${iid}`;

      let data = {
        NCM_ID: iid,
        CLOSED: "Y",
        CLOSED_DATE: new Date().toISOString(),
        INPUT_USER: getUserValue(),
      };

      if (test) {
        console.log(data);
      }

      const options = {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      };

      const response = await fetch(closeUrl, options);
      const json = await response.json();

      // refresh the page
      window.location.reload();
    });
  });
