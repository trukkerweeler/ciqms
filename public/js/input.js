import {
  loadHeaderFooter,
  createNotesSection,
  getUserValue,
  getDateTime,
} from "./utils.mjs";
loadHeaderFooter();

let user = await getUserValue();

// Get the project id from the url params
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let iid = urlParams.get("id");

const url = "http://localhost:3003/input/" + iid;
const inputUrl = "http://localhost:3003/input/";
const csrUrl = "http://localhost:3003/csr/";
const ssrUrl = "http://localhost:3003/ssr/";

const main = document.querySelector("main");
// Delete the child nodes of the main element
while (main.firstChild) {
  // if (main.firstChild.nodeName === 'section') {
  main.removeChild(main.firstChild);
  // section.remove();
  // }
}

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

      // detail title (Two buttons: Edit and Close)
      const detailTitle = document.createElement("h3");
      detailTitle.textContent = "Detail";

      // detail buttons div
      const detailButtons = document.createElement("div");
      detailButtons.setAttribute("class", "detailButtons");
      detailButtons.setAttribute("id", "detailButtons");
      const btnEditDetail = document.createElement("button");
      btnEditDetail.setAttribute("class", "btn");
      btnEditDetail.setAttribute("class", "btnEdit");
      btnEditDetail.setAttribute("id", "btnEditDetail");
      btnEditDetail.textContent = "Edit";

      // Create the close button
      const btnCloseDetail = document.createElement("button");
      btnCloseDetail.setAttribute("class", "btn");
      btnCloseDetail.setAttribute("class", "btnEdit");
      btnCloseDetail.setAttribute("id", "btnClose");
      btnCloseDetail.textContent = "Close";

      // Create the collect data button
      const btnCollData = document.createElement("button");
      btnCollData.setAttribute("class", "btn");
      btnCollData.setAttribute("class", "btnEdit");
      btnCollData.setAttribute("id", "btnCollData");
      btnCollData.textContent = "Collect";

      detailButtons.appendChild(btnCollData);
      detailButtons.appendChild(btnCloseDetail);
      detailButtons.appendChild(btnEditDetail);

      const elemFUP = document.createElement("p");
      elemFUP.setAttribute("id", "followup");
      const elemResponse = document.createElement("p");
      elemResponse.setAttribute("id", "response");

      // create detail p element for the input/request date
      const aiDate = document.createElement("p");
      aiDate.textContent =
        "Request Date:" + " " + record[key]["INPUT_DATE"].substring(0, 10);
      aiDate.setAttribute("class", "tbl");

      // create detail p element for the project id
      const projId = document.createElement("p");
      projId.textContent =
        "Project:" +
        " " +
        record[key]["PROJECT_ID"] +
        " - " +
        record[key]["NAME"];
      projId.setAttribute("class", "tbl");
      projId.setAttribute("id", "project");

      // create detail p element for the closed date
      const aiClosedDate = document.createElement("p");
      aiClosedDate.setAttribute("id", "closed");
      if (
        record[key]["CLOSED_DATE"] === null ||
        record[key]["CLOSED_DATE"] === "" ||
        record[key]["CLOSED_DATE"].length === 0
      ) {
        aiClosedDate.textContent = "Closed Date:" + " " + "";
        // console.log('closed date is null');
      } else {
        aiClosedDate.textContent =
          "Closed Date:" + " " + record[key]["CLOSED_DATE"].substring(0, 10);
      }
      aiClosedDate.setAttribute("class", "tbl");
      aiClosedDate.setAttribute("id", "closeddate");

      // toggle display of doit if recur id is not null
      const doit = document.querySelector("#doit");
      if (record[key]["RECUR_ID"] !== null) {
        doit.style.display = "block";
        // console.log('recur id is not null');
      } else {
        doit.style.display = "none";
        // console.log('recur id is null');
      }

      // create detail p element for the assigned to
      const aiAssTo = document.createElement("p");
      aiAssTo.textContent = "Assigned To:" + " " + record[key]["ASSIGNED_TO"];
      aiAssTo.setAttribute("class", "tbl");
      aiAssTo.setAttribute("id", "assignedto");

      // create detail p element for the request by
      const reqBy = document.createElement("p");
      reqBy.textContent = "Request By:" + " " + record[key]["PEOPLE_ID"];
      reqBy.setAttribute("class", "tbl");
      reqBy.setAttribute("id", "requestby");

      // create detail p element for the due date
      const due_date = document.createElement("p");
      if (record[key]["DUE_DATE"] === null) {
        due_date.textContent = "Due date:" + " " + "";
      } else
        due_date.textContent =
          "Due date:" + " " + record[key]["DUE_DATE"].substring(0, 10);
      due_date.setAttribute("class", "tbl");
      due_date.setAttribute("id", "duedate");

      // create detail p element for the response date
      const responseDate = document.createElement("p");
      responseDate.textContent =
        "Response Date:" + " " + record[key]["RESPONSE_DATE"];
      responseDate.setAttribute("class", "tbl");
      responseDate.setAttribute("id", "responseDate");
      // make it invisible
      responseDate.style.display = "none";

      // Create p element for the subject
      const elemSubject = document.createElement("p");
      elemSubject.textContent = "Subject: " + record[key]["SUBJECT"];
      elemSubject.setAttribute("class", "tbl");
      elemSubject.setAttribute("id", "subject");

      elemRpt.textContent = "Action Item Detail";
      elemRpt.setAttribute("class", "header");
      elemId.textContent = "Action Id: " + record[key]["INPUT_ID"];
      elemId.setAttribute("class", "header2");

      detailSection.appendChild(detailTitle);
      detailSection.appendChild(detailButtons);
      detailSection.appendChild(aiDate);
      detailSection.appendChild(aiAssTo);
      detailSection.appendChild(aiClosedDate);
      detailSection.appendChild(projId);
      detailSection.appendChild(reqBy);
      detailSection.appendChild(due_date);
      detailSection.appendChild(elemSubject);
      detailSection.appendChild(responseDate);

      main.appendChild(elemRpt);
      main.appendChild(elemId);

      main.appendChild(detailSection);
      // main.appendChild(notesSection);

      createNotesSection("INPUT_TEXT", record[key]["INPUT_TEXT"]);
      createNotesSection("FOLLOWUP_TEXT", record[key]["FOLLOWUP_TEXT"]);
      createNotesSection("RESPONSE_TEXT", record[key]["RESPONSE_TEXT"]);
    }
    // Response=======================================================================================================
    // Edit and Save response
    // listen for the Response button click
    const btnEditResp = document.getElementById("editResponse");
    btnEditResp.addEventListener("click", async (event) => {
      // prevent default action
      event.preventDefault();
      // get the action item id
      let queryString = window.location.search;
      let urlParams = new URLSearchParams(queryString);
      let iid = urlParams.get("id");
      // alert('Edit Response button clicked');
      const responseDialog = document.querySelector("#respDialog");
      const storedResponseDate = document.querySelector("#responseDate").value;
      // console.log(storedResponseDate);
      if (storedResponseDate === "") {
        const d = new Date();
        const date = d.toISOString().substring(0, 10);
        const time = d.toLocaleTimeString();
        const mydate = date + " " + time;
        document.querySelector("#responseDate").value = mydate;
      } else {
        const newResponseDate = document.querySelector("#newResponseDate");
        const d = new Date();
        newResponseDate.value = d.toISOString().substring(0, 10);
        // console.log(responseDate);
      }

      responseDialog.showModal();

      // listen for the cancel button click
      const btnCancelResp = document.querySelector("#cancelResp");
      btnCancelResp.addEventListener("click", async (event) => {
        // alert('Cancel Response button clicked');
        responseDialog.close();
      });

      // listen for the save response button click
      const btnSaveResp = document.querySelector("#saveResp");
      btnSaveResp.addEventListener("click", async (event) => {
        // prevent default action
        event.preventDefault();
        // alert('Save Response button clicked');

        // get the response text
        const oldResponseText =
          document.querySelector("#responseNote").innerHTML;
        const newResponseText = document.querySelector("#newTextResp").value;
        let responseText = newResponseText + "\n" + oldResponseText;
        const d = new Date();
        const date = d.toISOString().substring(0, 10);
        const time = d.toLocaleTimeString();
        const mydate = date + " " + time;
        // prepend response text with user name and date
        responseText =
          user +
          " - " +
          mydate +
          "\n" +
          newResponseText +
          "\n\n" +
          oldResponseText;
        responseText = responseText.replace(/\n/g, "<br>");
        // fix the apostrophe issue
        responseText = responseText.replace(/'/g, "''");

        let data = {
          INPUT_ID: iid,
          INPUT_USER: user,
          RESPONSE_TEXT: responseText,
          RESPONSE_DATE: document.querySelector("#newResponseDate").value,
        };
        // console.log(data);

        // update the response text
        const url = "http://localhost:3003/input/" + iid;
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data }),
        });
        // close the dialog
        responseDialog.close();
        // reload the page
        location.reload();
      });
    });

    // Action=======================================================================================================
    // listen for the Edit Action button click
    const btnEditAction = document.querySelector("#editAction");
    btnEditAction.addEventListener("click", async (event) => {
      // prevent default action
      event.preventDefault();
      // get the action item id
      let queryString = window.location.search;
      let urlParams = new URLSearchParams(queryString);
      let iid = urlParams.get("id");
      // alert('Action button clicked');
      const actionDialog = document.querySelector("#actionDialog");
      actionDialog.showModal();

      // listen for the cancel button click
      const btnCancelAction = document.querySelector("#cancelAction");
      btnCancelAction.addEventListener("click", async (event) => {
        actionDialog.close();
      });

      // listen for the save action button click
      const btnSaveAction = document.querySelector("#saveAction");
      btnSaveAction.addEventListener("click", async (event) => {
        // prevent default action
        event.preventDefault();
        // alert('Save Action button clicked');
        // get the action text
        const oldActionText = document.querySelector("#actionNote").innerHTML;
        const newActionText = document.querySelector("#newTextAction").value;
        // warn and break if the action text is empty
        if (newActionText.length === 0) {
          alert("Action text cannot be empty");
          return;
        }
        let actionText = newActionText + "\n" + oldActionText;
        const d = new Date();
        const date = d.toISOString().substring(0, 10);
        const time = d.toLocaleTimeString();
        const mydate = date + " " + time;
        // prepend action text with user name and date
        actionText =
          user + " - " + mydate + "\n" + newActionText + "\n\n" + oldActionText;
        actionText = actionText.replace(/\n/g, "<br>");
        // fix the apostrophe issue
        actionText = actionText.replace(/'/g, "''");

        let data = {
          INPUT_ID: iid,
          INPUT_USER: user,
          INPUT_TEXT: actionText,
        };
        // console.log(data);

        // update the action text
        const url = "http://localhost:3003/input/" + iid;
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data }),
        });
        // close the dialog
        actionDialog.close();
        // reload the page
        location.reload();
      });
    });

    // Follow Up=======================================================================================================
    // listen for the Follow Up button click
    const btnEditFlup = document.querySelector("#editFollowUp");
    btnEditFlup.addEventListener("click", async (event) => {
      // prevent default action
      event.preventDefault();
      // get the action item id
      let queryString = window.location.search;
      let urlParams = new URLSearchParams(queryString);
      let iid = urlParams.get("id");
      // alert('Follow Up button clicked');
      const followUpDialog = document.querySelector("#followupDialog");
      followUpDialog.showModal();

      // listen for the followup cancel button click
      const btnCancelFlup = document.querySelector("#cancelFollowUp");
      btnCancelFlup.addEventListener("click", async (event) => {
        followUpDialog.close();
      });

      // listen for the save follow up button click
      const btnSaveFlup = document.querySelector("#saveFlup");
      btnSaveFlup.addEventListener("click", async (event) => {
        // prevent default action
        event.preventDefault();
        // alert('Save Follow Up button clicked');
        // get the follow up text
        const oldFollowUpText =
          document.querySelector("#followUpNote").innerHTML;
        const newFollowUpText =
          document.querySelector("#newTextFollowup").value;
        let followUpText = newFollowUpText + "\n" + oldFollowUpText;
        const d = new Date();
        const date = d.toISOString().substring(0, 10);
        const time = d.toLocaleTimeString();
        const mydate = date + " " + time;
        // prepend follow up text with user name and date
        followUpText =
          user +
          " - " +
          mydate +
          "\n" +
          newFollowUpText +
          "\n\n" +
          oldFollowUpText;
        followUpText = followUpText.replace(/\n/g, "<br>");
        // fix the apostrophe issue
        followUpText = followUpText.replace(/'/g, "''");

        let data = {
          INPUT_ID: iid,
          INPUT_USER: user,
          FOLLOWUP_TEXT: followUpText,
        };
        // console.log(data);

        // update the follow up text
        const url = "http://localhost:3003/input/" + iid;
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data }),
        });
        // close the dialog
        followUpDialog.close();
        // reload the page
        location.reload();
      });
    });

    // Collect Data=======================================================================================================
    // listen for the Collect Data button click
    const btnCollData = document.querySelector("#btnCollData");
    btnCollData.addEventListener("click", async (event) => {
      event.preventDefault();
      // if the subject is SC then show the supplier collect data dialog
      const subject = document.querySelector("#subject").textContent;
      // console.log(subject);
      if (subject.includes("SC")) {
        // show the supplier collect data dialog
        const collectDataDialog = document.querySelector("#collectDataDialog2");
        collectDataDialog.showModal();

        // listen for the cancel button click
        const btnCancelCollData = document.querySelector("#cancelCollData2");
        btnCancelCollData.addEventListener("click", async (event) => {
          collectDataDialog.close();
        });

        // listen for the save button click
        const btnSaveCollData = document.querySelector("#saveCollData2");
        btnSaveCollData.addEventListener("click", async (event) => {
          // prevent default action
          event.preventDefault();
          // get the nextId for the collect data
          // console.log( ssrUrl + 'nextSSRId')
          const nextId = await fetch(ssrUrl + "nextSSRId", { method: "GET" })
            .then((response) => response.json())
            .then((data) => {
              JSON.stringify(data);
              return data;
            });
          // get the form data
          const collectForm = document.querySelector("#collectForm2");
          let data = new FormData(collectForm);
          // append data with the nextId
          // data.append('INPUT_ID', iid);
          // data.append('INPUT_USER', user);

          const dataJson = {
            VENDPERF_ID: nextId,
            PEOPLE_ID: user,
          };

          // console log the form data
          for (let field of data.keys()) {
            if (field in ["SUPPLIER_ID", "UNIT", "PEOPLE_ID"]) {
              dataJson[field] = data.get(field).toUpperCase();
            } else {
              console.log(field + ": " + data.get(field));
              dataJson[field] = data.get(field);
            }
          }
          console.log(dataJson);

          // post the collect data text
          const ssrUrl2 = "http://localhost:3003/ssr/" + iid;
          // console.log(ssrUrl2);
          try {
            await fetch(ssrUrl2, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ dataJson }),
            });
          } catch (err) {
            console.log("Error:", err);
          }
          // close the dialog
          collectDataDialog.close();
          // clear the form fields
          collectForm.reset();
          // reload the page
          location.reload();
        });
      } else {
      // show the customer collect data dialog
      const collectDataDialog = document.querySelector("#collectDataDialog");
      collectDataDialog.showModal();
      
      // listen for the cancel button click
      const btnCancelCollData = document.querySelector("#cancelCollData");
      btnCancelCollData.addEventListener("click", async (event) => {
        collectDataDialog.close();
      });
      
      // listen for the save button click
      const btnSaveCollData = document.querySelector("#saveCollData");
      btnSaveCollData.addEventListener("click", async (event) => {
        // prevent default action
        event.preventDefault();
        // get the nextId for the collect data
        // console.log( csrUrl + 'nextCSRId')
        const nextId = await fetch(csrUrl + "nextCSRId", { method: "GET" })
        .then((response) => response.json())
        .then((data) => {
          JSON.stringify(data);
          return data;
        });
        // get the form data
        const collectForm = document.querySelector("#collectForm");
        let data = new FormData(collectForm);
        // append data with the nextId
        // data.append('INPUT_ID', iid);
        // data.append('INPUT_USER', user);
        
        const dataJson = {
          COLLECT_ID: nextId,
          INPUT_USER: user,
        };
        
        // console log the form data
        for (let field of data.keys()) {
          if (field in ["CUSTOMER_ID", "UNIT"]) {
            dataJson[field] = data.get(field).toUpperCase();
          } else {
            console.log(field + ": " + data.get(field));
            dataJson[field] = data.get(field);
          }
        }
        console.log(dataJson);
        
        // post the collect data text
        const csrUrl2 = "http://localhost:3003/csr/" + iid;
        // console.log(csrUrl2);
        try {
          await fetch(csrUrl2, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ dataJson }),
          });
        } catch (err) {
          console.log("Error:", err);
        }
        // close the dialog
        collectDataDialog.close();
        // clear the form fields
        collectForm.reset();
        // reload the page
        location.reload();
      });
    }
    });

    // listen for the close button click
    const closebutton = document.querySelector("#btnClose");
    closebutton.addEventListener("click", async (event) => {
      event.preventDefault();
      // console.log('closing the action item');

      // if the action item is already closed, do not close it again
      const closed = document.querySelector("#closeddate");
      // if the 10 rightmost characters are a date, the action item is closed
      if (closed.textContent.length > 15) {
        alert("This action item is already closed");
        return;
      }
      console.log(iid);
      let aidValue = iid;
      if (aidValue.length === 0) {
        alert("Please enter the Input ID");
      } else {
        // console.log(aidValue);
        // console.log(aidValue.length);
        while (aidValue.length < 7) {
          aidValue = "0" + aidValue;
        }
      }

      const url = inputUrl + "close/" + aidValue;
      // console.log(url);

      let data = {
        INPUT_ID: aidValue,
        CLOSED: "Y",
        CLOSED_DATE: getDateTime(),
      };

      console.log(data);

      const options = {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      };

      const response = await fetch(url, options);
      const json = await response.json();

      // const formappendai = document.querySelector('#formappendai');
      // // clear the form fields
      // formappendai.innerHTML = '';

      // reload the page
      location.reload();
    });

    // listen for the edit detail button click, populate the edit dialog fields, show the dialog
    const btnEditDetail = document.querySelector("#btnEditDetail");
    btnEditDetail.addEventListener("click", async (event) => {
      // prevent default action
      event.preventDefault();
      // get the action item id
      let queryString = window.location.search;
      let urlParams = new URLSearchParams(queryString);
      let iid = urlParams.get("id");
      const detailDialog = document.querySelector("#inputDialog");
      detailDialog.showModal();
      // populate the dialog fields
      let assignedto = document.querySelector("#assignedto").textContent;
      assignedto = assignedto.substring(13);
      let duedate = document.querySelector("#duedate").textContent;
      duedate = duedate.substring(10);
      let project = document.querySelector("#project").textContent;
      project = project.substring(9);
      project = project.split(" ")[0];
      let requestby = document.querySelector("#requestby").textContent;
      requestby = requestby.substring(11);
      let subject = document.querySelector("#subject").textContent;
      subject = subject.substring(9);
      // console.log(assignedto, duedate, project, requestby, subject);
      // populate the dialog fields
      document.querySelector("#ASSIGNED_TO").value = assignedto.trim();
      document.querySelector("#DUE_DATE").value = duedate.trim();
      document.querySelector("#PROJECT_ID").value = project.trim();
      document.querySelector("#REQUESTED_BY").value = requestby.trim();
      document.querySelector("#SUBJECT").value = subject.trim();

      // listen for the cancel button click
      const btnCancelDetail = document.querySelector("#cancelEdit");
      btnCancelDetail.addEventListener("click", async (event) => {
        detailDialog.close();
      });

      // listen for the save detail button click
      const btnSaveDetail = document.querySelector("#saveDetail");
      btnSaveDetail.addEventListener("click", async (event) => {
        // prevent default action
        event.preventDefault();

        let data = {
          INPUT_ID: iid,
          ASSIGNED_TO: document.querySelector("#ASSIGNED_TO").value,
          DUE_DATE: document.querySelector("#DUE_DATE").value,
          PROJECT_ID: document.querySelector("#PROJECT_ID").value,
          REQUESTED_BY: document.querySelector("#REQUESTED_BY").value,
          SUBJECT: document.querySelector("#SUBJECT").value,
          MODIFIED_DATE: getDateTime(),
          MODIFIED_BY: user,
        };

        // console.log(data);

        // update the action text
        const url = "http://localhost:3003/input/detail/" + iid;
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data }),
        });
        // close the dialog
        detailDialog.close();
        // reload the page
        location.reload();
      });
    });
  });
