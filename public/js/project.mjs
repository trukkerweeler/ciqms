import { loadHeaderFooter, myport } from "./utils.mjs";
loadHeaderFooter();
const port = myport();

// Get the project id from the url params
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let projectId = urlParams.get("id");

const url = `http://localhost:${port}/project/${projectId}`;

// Fetch recurring subjects for this project
let recurringSubjects = [];
const recurringUrl = `http://localhost:${port}/project/rcursbjct/${projectId}`;

const main = document.querySelector("main");
// Delete the child nodes of the main element
while (main.firstChild) {
  // if (main.firstChild.nodeName === 'section') {
  main.removeChild(main.firstChild);
  // section.remove();
  // }
}

// Fetch both project data and recurring subjects
Promise.all([
  fetch(url, { method: "GET" }),
  fetch(recurringUrl, { method: "GET" }),
])
  .then(([projectResponse, recurringResponse]) =>
    Promise.all([projectResponse.json(), recurringResponse.json()])
  )
  .then(([record, recurringSubjectsData]) => {
    recurringSubjects = recurringSubjectsData;

    // console.log(record);
    if (record.length === 0) {
      const message = document.createElement("h1");
      message.textContent = "No records found for project " + projectId;
      main.appendChild(message);
      return;
    }

    const fieldList = [
      "INPUT_ID",
      "INPUT_DATE",
      "ASSIGNED_TO",
      "SUBJECT",
      "INPUT_TEXT",
      "CLOSED",
      "CLOSED_DATE",
    ];

    const descriptionSection = document.createElement("section");
    descriptionSection.setAttribute("class", "project-header-section");

    // Project Name (h2)
    const descriptionHeader = document.createElement("h2");
    descriptionHeader.textContent = record[0].NAME;
    descriptionSection.appendChild(descriptionHeader);

    // Project Description (h3) - from PROJ_DESC table
    if (record[0].DESCRIPTION && record[0].DESCRIPTION.trim() !== "") {
      const projectDescription = document.createElement("h3");
      projectDescription.textContent = record[0].DESCRIPTION;
      projectDescription.setAttribute("class", "project-description");
      descriptionSection.appendChild(projectDescription);
    }

    // Project Leader (h4) - demoted from h3 to follow hierarchy
    const leader = document.createElement("h4");
    leader.textContent = "Project Leader: " + record[0].LEADER;
    descriptionSection.appendChild(leader);

    // Create a close button only if PROJECT_TYPE is not "QMS"
    if (record[0].PROJECT_TYPE !== "QMS") {
      const closeButton = document.createElement("button");
      closeButton.textContent = "Close Project";
      closeButton.setAttribute("class", "close-button");
      descriptionSection.appendChild(closeButton);

      // Add the event listener to the close button
      closeButton.addEventListener("click", (e) => {
        e.preventDefault();
        const closeUrl = `http://localhost:${port}/project/close/${projectId}`;
        fetch(closeUrl, { method: "PUT" })
          // if the response is 200, reload the page
          .then((response) => {
            if (response.status === 200) {
              location.reload();
            }

            // if the response is 500, display an error message
            if (response.status === 500) {
              const message = document.createElement("h1");
              message.textContent = "Error closing project " + projectId;
              main.appendChild(message);
            }
          });
      });
    }
    // descriptionSection.appendChild(detailParagraph);
    main.appendChild(descriptionSection);

    // Create the Actions header section with checkbox
    const actionsSection = document.createElement("div");
    actionsSection.setAttribute("class", "actions-header-section");

    const actionsHeader = document.createElement("h1");
    actionsHeader.textContent = "Actions";

    const recurringContainer = document.createElement("div");
    recurringContainer.setAttribute("class", "recurring-container");

    const recurringCheckbox = document.createElement("input");
    recurringCheckbox.setAttribute("type", "checkbox");
    recurringCheckbox.setAttribute("id", "recurring-checkbox");
    recurringCheckbox.checked = true; // Default as selected

    const recurringLabel = document.createElement("label");
    recurringLabel.setAttribute("for", "recurring-checkbox");
    recurringLabel.textContent = "Recurring";

    recurringContainer.appendChild(recurringCheckbox);
    recurringContainer.appendChild(recurringLabel);

    actionsSection.appendChild(actionsHeader);
    actionsSection.appendChild(recurringContainer);

    main.appendChild(actionsSection);

    // Function to filter and render table
    function renderTable(showRecurring = true) {
      // Remove existing table if it exists
      const existingTable = main.querySelector("table");
      if (existingTable) {
        existingTable.remove();
      }

      // Calculate the date one year ago from today
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // Filter records based on checkbox state and closed date
      let filteredRecord = record.filter((row) => {
        // First filter: exclude items closed more than a year ago
        if (row.CLOSED_DATE && row.CLOSED_DATE !== null) {
          const closedDate = new Date(row.CLOSED_DATE);
          if (closedDate < oneYearAgo) {
            return false; // Don't show items closed more than a year ago
          }
        }

        // Second filter: recurring subjects filter
        if (!showRecurring) {
          return !recurringSubjects.includes(row.SUBJECT);
        }

        return true; // Show the item if it passes all filters
      });

      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");
      const header = document.createElement("tr");

      // Create the table header
      for (const key in record[0]) {
        if (fieldList.includes(key)) {
          const th = document.createElement("th");
          th.textContent = key;
          header.appendChild(th);
        }
      }
      thead.appendChild(header);

      // Create the table body
      for (const row of filteredRecord) {
        const tr = document.createElement("tr");
        for (const field in row) {
          if (fieldList.includes(field)) {
            const td = document.createElement("td");
            // fix the date format
            if (field === "INPUT_DATE" || field === "CLOSED_DATE") {
              if (row[field] === null) {
                td.textContent = "";
              } else {
                const date = new Date(row[field]);
                td.textContent = date.toLocaleDateString();
              }
              tr.appendChild(td);
            }
            // create link to the input page for the column INPUT_ID
            else if (field === "INPUT_ID") {
              const a = document.createElement("a");
              a.setAttribute("href", "input.html?id=" + row[field]);
              a.textContent = row[field];
              td.appendChild(a);
              tr.appendChild(td);
            } else {
              td.textContent = row[field];
              tr.appendChild(td);
            }
          }
        }
        tbody.appendChild(tr);

        // get the response text
        const responseText = row.RESPONSE_TEXT;
        const rtr = document.createElement("tr");
        const rtd = document.createElement("td");
        rtd.setAttribute("colspan", "6");
        rtd.setAttribute("class", "response");
        if (responseText !== null) {
          // fix the carriage returns
          const response = responseText.replace(/\n/g, "</br>");
          rtd.innerHTML = response;
        } else {
          rtd.textContent = "No response.";
        }
        rtr.appendChild(rtd);
        tbody.appendChild(rtr);
      }

      table.appendChild(thead);
      table.appendChild(tbody);
      main.appendChild(table);
    }

    // Initial render with recurring actions shown
    renderTable(true);

    // Add event listener to checkbox
    recurringCheckbox.addEventListener("change", function () {
      renderTable(this.checked);
    });
  })
  .catch((error) => {
    console.error("Error fetching data:", error);
    const message = document.createElement("h1");
    message.textContent = "Error loading project data";
    main.appendChild(message);
  });
