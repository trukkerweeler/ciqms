import {
  loadHeaderFooter,
  getUserValue,
  myport,
  getDateTime,
} from "./utils.mjs";
loadHeaderFooter();
const user = await getUserValue();
const port = myport() || 3003;
const test = true;

// Get the project id from the url params
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let drid = urlParams.get("id");

// if (test) {
//     console.log('testing requests.js');
//     console.log('User: ' + user);
//     console.log(drid);
// }

const url = `http://localhost:${port}/requests/${drid}`;

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
      detailHeading.textContent = "Request Detail";

      const divDetailBtns = document.createElement("div");
      divDetailBtns.setAttribute("class", "detailButtons");
      divDetailBtns.setAttribute("id", "detailButtons");

      const btnEditDetails = document.createElement("button");
      btnEditDetails.setAttribute("class", "btn");
      btnEditDetails.setAttribute("class", "btnEditNotes");
      btnEditDetails.textContent = "Edit";
      btnEditDetails.setAttribute("id", "btnEditDetails");
      btnEditDetails.setAttribute("type", "submit");

      // let detailTable = document.createElement('table');
      // let thead = document.createElement('thead');
      detailSection.appendChild(detailHeading);
      divDetailBtns.appendChild(btnEditDetails);
      detailSection.appendChild(divDetailBtns);

      const fieldList = [
        "REQUEST_DATE",
        "ASSIGNED_TO",
        "DUE_DATE",
        "DOCUMENT_ID",
        "DOC_CHG_REG_TXT",
      ];
      for (const key in record[0]) {
        if (fieldList.includes(key)) {
          const p = document.createElement("p");
          p.setAttribute("class", "docdata");
          switch (key) {
            case "REQUEST_DATE":
              p.textContent = "Request Date: " + record[0][key].slice(0, 10);
              break;
            case "DUE_DATE":
              p.textContent = "Due Date: " + record[0][key].slice(0, 10);
              break;
            case "REVISION_LEVEL":
              p.textContent = "Rev. " + record[0][key];
              break;
            default:
              if (record[0][key] === null) {
                p.textContent = key + ": ";
              } else {
                p.textContent = key + ": " + record[0][key];
              }
          }
          detailSection.appendChild(p);
          main.appendChild(detailSection);
        }
      }

      // Make request section
      const requestSection = document.createElement("section");
      requestSection.setAttribute("class", "notesgrid");
      requestSection.setAttribute("id", "requestSection");

      // Create a grid container for the request section
      const requestSectionGrid = document.createElement("div");
      requestSectionGrid.setAttribute("class", "section-grid");

      // Create title text span
      const requestTitleTextSpan = document.createElement("span");
      requestTitleTextSpan.setAttribute("class", "title-text");
      requestTitleTextSpan.textContent = "Request Text:";

      // Create edit button
      const btnEditRequest = document.createElement("button");
      btnEditRequest.setAttribute("class", "btn");
      btnEditRequest.setAttribute("class", "btnEditNotes");
      btnEditRequest.textContent = "Edit";
      btnEditRequest.setAttribute("id", "btnEditRequest");
      btnEditRequest.setAttribute("type", "submit");

      // Create content div
      const requestText = document.createElement("div");
      requestText.setAttribute("class", "notes");
      requestText.setAttribute("id", "requestText");
      let formattedRequestText = record[key]["REQUEST_TEXT"];
      if (formattedRequestText === null) {
        formattedRequestText = "";
      } else {
        formattedRequestText = formattedRequestText.replace("\n", "<br>");
      }
      requestText.innerHTML = formattedRequestText;

      // Add all three elements to the grid: title, button, content
      requestSectionGrid.appendChild(requestTitleTextSpan);
      requestSectionGrid.appendChild(btnEditRequest);
      requestSectionGrid.appendChild(requestText);
      requestSection.appendChild(requestSectionGrid);

      //   Make response section
      const responseSection = document.createElement("section");
      responseSection.setAttribute("class", "notesgrid");
      responseSection.setAttribute("id", "responseSection");

      // Create a grid container for the response section
      const responseSectionGrid = document.createElement("div");
      responseSectionGrid.setAttribute("class", "section-grid");

      // Create title text span
      const responseTitleTextSpan = document.createElement("span");
      responseTitleTextSpan.setAttribute("class", "title-text");
      responseTitleTextSpan.textContent = "Response Text:";

      // Create edit button
      const btnEditResp = document.createElement("button");
      btnEditResp.setAttribute("class", "btn");
      btnEditResp.setAttribute("class", "btnEditNotes");
      btnEditResp.textContent = "Edit";
      btnEditResp.setAttribute("id", "btnEditResp");
      btnEditResp.setAttribute("type", "submit");

      // Create content div
      const responseText = document.createElement("div");
      responseText.setAttribute("class", "notes");
      responseText.setAttribute("id", "responseText");
      if (record[key]["RESPONSE_TEXT"] === null) {
        responseText.innerHTML = "";
      } else {
        let formattedResponseText = record[key]["RESPONSE_TEXT"];
        if (formattedResponseText === null) {
          formattedResponseText = "";
        } else {
          formattedResponseText = formattedResponseText.replace("\n", "<br>");
        }
        responseText.innerHTML = formattedResponseText;
      }

      // Add all three elements to the grid: title, button, content
      responseSectionGrid.appendChild(responseTitleTextSpan);
      responseSectionGrid.appendChild(btnEditResp);
      responseSectionGrid.appendChild(responseText);
      responseSection.appendChild(responseSectionGrid);

      elemRpt.textContent = "Document Change Request Detail";
      elemRpt.setAttribute("class", "header");

      elemId.textContent = "Change ID: " + record[0]["REQUEST_ID"];
      elemId.setAttribute("class", "header2");
      elemId.setAttribute("id", "nid");

      // make a div for the subtitle and add the subtitle to the div and a button
      const divSubTitle = document.createElement("div");
      divSubTitle.setAttribute("class", "subtitlewithbutton");

      // Add title to the div
      divSubTitle.appendChild(elemId);

      // Add close button to the div
      const btnClose = document.createElement("button");
      btnClose.setAttribute("class", "closebutton");
      btnClose.textContent = "Close";
      btnClose.setAttribute("id", "btnCloseDCR");
      btnClose.setAttribute("type", "submit");

      // disable the close button
      if (user === "TKENT") {
        btnClose.disabled = false;
      } else {
        btnClose.disabled = true;
      }

      divSubTitle.appendChild(btnClose);

      // Add event listener for the close button
      btnClose.addEventListener("click", async (event) => {
        event.preventDefault();
        // console.log("btnCloseDCR @85 button clicked");
        // show the close dialog
        const closeDialog = document.querySelector("#closeDialog");
        closeDialog.showModal();

        // Listen for the cancel button click
        const cancelClose = document.querySelector("#btnCloseClose");
        cancelClose.addEventListener("click", async (event) => {
          event.preventDefault();
          closeDialog.close();
        });

        // Listen for the SaveClose button click
        const saveClose = document.querySelector("#btnSaveClose");
        const closeUrl = `http://localhost:${port}/requests/close/${drid}`;
        saveClose.addEventListener("click", async (event) => {
          event.preventDefault();
          //   match case decision select and change to Y-N-P
          let decision = document.querySelector("#decision").value;
          let decisioncode = "";
          if (decision === "Approved") {
            decisioncode = "A";
          } else if (decision === "Rejected") {
            decisioncode = "N";
          } else {
            decisioncode = "P";
          }

          const decisionDate = document.querySelector("#decisiondate").value;

          let data = {
            DOCUMENT_ID: record[0]["DOCUMENT_ID"],
            REQUEST_ID: drid,
            DECISION: decisioncode,
            DECISION_DATE: decisionDate,
            CLOSED: "Y",
            CLOSED_DATE: getDateTime(),
            MODIFIED_BY: user,
            MODIFIED_DATE: getDateTime(),
          };

          // Only update revision fields if decision is approved
          if (decisioncode === "A") {
            const newRevision = document.querySelector("#docnewrev").value;
            const newRevDate = document.querySelector("#docnewrevdate").value;
            data.REVISION_LEVEL = newRevision;
            data.REVISION_DATE = newRevDate;
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
          const response = await fetch(closeUrl, options);

          // Call document release notifications
          try {
            const notifyUrl = `http://localhost:${port}/documents/release-notifications`;
            await fetch(notifyUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            });
          } catch (error) {
            console.log("Error calling release notifications:", error);
          }

          closeDialog.close();
          // refresh the page
          window.location.reload();
        });
      });

      main.appendChild(elemRpt);
      main.appendChild(divSubTitle);
      main.appendChild(detailSection);
      main.appendChild(requestSection);
      main.appendChild(responseSection);
    }

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

    // =============================================
    // Listen for the btnEditDetails button
    const editDetail = document.querySelector("#btnEditDetails");
    editDetail.addEventListener("click", async (event) => {
      // prevent the default action
      event.preventDefault();
      console.log("btnEditDetails @184 button clicked");
      const detailDialog = document.querySelector("#detailDialog");

      // show the detail dialog
      detailDialog.showModal();
    });

    // Listen for the saveDetail button click
    const saveDetail = document.querySelector("#btnSaveEditReq");
    const detailsUrl = `http://localhost:${port}/sysdocs/${drid}`;
    saveDetail.addEventListener("click", async (event) => {
      // prevent the default action
      event.preventDefault();
      // get the input id
      const nid = document.querySelector("#nid");
      let didValue = drid;

      let data = {
        DOCUMENT_ID: didValue,
      };

      for (const key in record) {
        for (const field in record[key]) {
          if (
            [
              "NAME",
              "TYPE",
              "SUBJECT",
              "STATUS",
              "REVISION_LEVEL",
              "ISSUE_DATE",
              "CTRL_DOC",
              "DIST_DOC",
            ].includes(field)
          ) {
            const fieldname = field;
            const fieldvalue = document.querySelector("#" + field).value;
            data = { ...data, [fieldname]: fieldvalue };
          }
        }
      }
      // add the user to the data object
      data = { ...data, MODIFIED_BY: user };
      // add the modified date to the data object
      const modifiedDate = new Date();
      data = { ...data, MODIFIED_DATE: new Date().toLocaleString() };

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

      const response = await fetch(detailsUrl, options);
      // const json = await response.json();
      // searchbutton.click();
      requestDialog.close();
      // refresh the page
      window.location.reload();
    });

    //   Add event listener for the request button - Notes
    const btnEditRequest = document.querySelector("#btnEditRequest");
    btnEditRequest.addEventListener("click", async (event) => {
      event.preventDefault();
      console.log("btnEditRequest @373 button clicked");
      const requestDialog = document.querySelector("#requestDialog");
      requestDialog.showModal();

      // Listen for the saveRequest button click
      const saveRequest = document.querySelector("#btnSaveRequest");
      const requestUrl = `http://localhost:${port}/requests/request/${drid}`;
      saveRequest.addEventListener("click", async (event) => {
        // prevent the default action
        event.preventDefault();
        // get the input id
        const nid = document.querySelector("#nid");
        let dridValue = drid;

        let data = {
          REQUEST_ID: dridValue,
        };

        let existingText = record[0]["REQUEST_TEXT"];
        // if the existing text is null then set it to an empty string
        if (existingText === null) {
          existingText = "";
        }

        // get the new text value, if it exists then update the data object
        if (document.querySelector("#request").value !== "") {
          const newReqText = document.querySelector("#request").value;
          // prepend the newReqText with user and date
          let newText =
            user +
            " - " +
            new Date().toLocaleString() +
            "<br>" +
            newReqText +
            "<br><br>" +
            existingText;
          // replace the break tags with newline characters
          newText = newText.replace(/<br>/g, "\n");
          data = { ...data, REQUEST_TEXT: newText };
        } else {
          alert("Please enter new request text.");
          return;
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

        const response = await fetch(requestUrl, options);
        // const json = await response.json();
        // searchbutton.click();
        requestDialog.close();
        // refresh the page
        window.location.reload();
      });
    });
    // });

    //   Add event listener for the response button
    const editResponse = document.querySelector("#btnEditResp");
    editResponse.addEventListener("click", async (event) => {
      event.preventDefault();
      console.log("btnEditResp @342 button");
      const responseDialog = document.querySelector("#responseDialog");
      // show the dialog
      responseDialog.showModal();

      // Listen for the saveResponse button click
      const saveResponse = document.querySelector("#btnSaveResponse");
      const responseUrl = `http://localhost:${port}/requests/response/${drid}`;

      saveResponse.addEventListener("click", async (event) => {
        // prevent the default action
        event.preventDefault();
        // get the input id
        const nid = document.querySelector("#nid");
        let dridValue = drid;

        let data = {
          REQUEST_ID: dridValue,
        };

        let existingResponseText = record[0]["RESPONSE_TEXT"];
        // if the existing text is null then set it to an empty string
        if (existingResponseText === null) {
          existingResponseText = "";
        }
        // console.log("existingResponseText: " + existingResponseText);
        // if there is no new text then alert the user
        if (document.querySelector("#dcrresponse").value === "") {
          alert("Please enter new response text.");
          return;
        }
        let newRespText = document.querySelector("#dcrresponse").value;
        // prepend the newReqText with user and date
        let compositeResponseText =
          user +
          " - " +
          new Date().toLocaleString() +
          "<br>" +
          newRespText +
          "<br><br>" +
          existingResponseText;

        // replace the break tags with newline characters
        compositeResponseText = compositeResponseText.replace(/<br>/g, "\n");
        // console.log("compositeResponseText: " + compositeResponseText);
        data = { ...data, RESPONSE_TEXT: compositeResponseText };

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

        const response = await fetch(responseUrl, options);
        // const json = await response.json();
        // searchbutton.click();
        responseDialog.close();
        // refresh the page
        window.location.reload();
      });
    });
  });
