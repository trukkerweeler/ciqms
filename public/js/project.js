import { loadHeaderFooter } from "./utils.mjs";
loadHeaderFooter();

// Get the project id from the url params
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let projectId = urlParams.get("id");

const url = "http://localhost:3003/project/" + projectId;

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
    if (record.length === 0) {
      const message = document.createElement("h1");
      message.textContent = "No records found for project " + projectId;
      main.appendChild(message);
      return;
    }
    const fieldList = [
      "INPUT_ID",
      "INPUT_DATE",
      "SUBJECT",
      "INPUT_TEXT",
      "CLOSED",
      "CLOSED_DATE",
    ];
    const descriptionSection = document.createElement("section");
    const detailParagraph = document.createElement("p");
    // detailParagraph.textContent =
      // "Project Description: " + record[0].DESCRIPTION + " ";
    const leader = document.createElement("h3");
    leader.textContent = "Project Leader: " + record[0].LEADER;
    const descriptionHeader = document.createElement("h2");
    descriptionHeader.textContent = record[0].NAME;
    descriptionSection.appendChild(descriptionHeader);
    descriptionSection.appendChild(leader);
    // descriptionSection.appendChild(detailParagraph);
    main.appendChild(descriptionSection);
    const actionsHeader = document.createElement("h1");
    actionsHeader.textContent = "Actions";
    main.appendChild(actionsHeader);
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    const header = document.createElement("tr");
    const td = document.createElement("td");

    // Create the table header
    for (const key in record[0]) {
      if (fieldList.includes(key)) {
        const th = document.createElement("th");
        th.textContent = key;
        header.appendChild(th);
      }
      thead.appendChild(header);
    }

    // Create the table body
    for (const row of record) {
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
          } else td.textContent = row[field];
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }

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
  });
