import { loadHeaderFooter, getUserValue, myport } from "./utils.mjs";
import users from "./users.mjs";
// import { exec } from 'child_process';
// import * as fs from 'node:fs/promises';
loadHeaderFooter();
const port = myport();

const url = `http://localhost:${port}/ncm`;
let user; // Will be set in initialization

// Function to fetch subjects from the server
async function fetchSubjects() {
  try {
    const subjectsUrl = `http://localhost:${port}/ncm/subjects`;
    // console.log("Fetching subjects from:", subjectsUrl);
    const response = await fetch(subjectsUrl, { method: "GET" });

    if (!response.ok) {
      console.error("Response not ok:", response.status, response.statusText);
      return getHardcodedSubjects();
    }

    const subjects = await response.json();
    // console.log("Fetched subjects:", subjects);

    if (subjects.length === 0) {
      // console.log("No subjects returned from database, using hardcoded values");
      return getHardcodedSubjects();
    }

    return subjects;
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return getHardcodedSubjects();
  }
}

// Fallback hardcoded subjects based on the help file
function getHardcodedSubjects() {
  return [
    { SUBJECT: "HFS", DESCRIPTION: "Held For Statement" },
    { SUBJECT: "DAM", DESCRIPTION: "Damaged" },
    { SUBJECT: "FRM", DESCRIPTION: "Form" },
    { SUBJECT: "FIT", DESCRIPTION: "Fit" },
    { SUBJECT: "FUN", DESCRIPTION: "Function" },
    { SUBJECT: "WKM", DESCRIPTION: "Workmanship" },
  ];
}

// Initialize default values
function initializeDefaults() {
  let recordDate = new Date();
  recordDate.setDate(recordDate.getDate());
  recordDate = recordDate.toISOString().slice(0, 10);
  const defaultNcmDate = document.getElementById("NCM_DATE");
  if (defaultNcmDate) defaultNcmDate.value = recordDate;

  let myDueDateDefault = new Date();
  myDueDateDefault.setDate(myDueDateDefault.getDate() + 14);
  myDueDateDefault = myDueDateDefault.toISOString().slice(0, 10);
  const defaultDueDate = document.getElementById("DUE_DATE");
  if (defaultDueDate) defaultDueDate.value = myDueDateDefault;

  const reqby = document.getElementById("reqby");
  if (reqby) reqby.value = user;

  const assto = document.getElementById("assto");
  if (assto) assto.value = "TKENT";
}

// Populate the subject dropdown
async function populateSubjectDropdown() {
  // console.log("Starting to populate subject dropdown");

  const subjects = await fetchSubjects();
  // console.log("Got subjects for dropdown:", subjects);

  const subjectSelect = document.getElementById("subject");

  if (!subjectSelect) {
    console.error("Subject select element not found!");
    return;
  }

  // Clear existing options except the first one
  while (subjectSelect.children.length > 1) {
    subjectSelect.removeChild(subjectSelect.lastChild);
  }

  // Add options from subjects data
  subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject.SUBJECT;
    option.textContent = `${subject.SUBJECT} - ${subject.DESCRIPTION}`;
    subjectSelect.appendChild(option);
    // console.log("Added option:", option.textContent);
  });

  // console.log("Finished populating dropdown with", subjects.length, "options");
}

// Initialize everything when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // console.log("DOM loaded, initializing form");

    // Initialize user value
    user = await getUserValue();
    // console.log("User initialized:", user);

    initializeDefaults();
    // console.log("Defaults initialized");

    await populateSubjectDropdown();
    // console.log("Subject dropdown populated");

    setupFormHandler();
    // console.log("Form handler set up");
  } catch (error) {
    console.error("Error during initialization:", error);
  }
});

// Also try window.onload as backup
window.addEventListener("load", async () => {
  try {
    // console.log("Window loaded - backup initialization");
    // Only populate if not already done
    const subjectSelect = document.getElementById("subject");
    if (subjectSelect && subjectSelect.children.length <= 1) {
      // console.log("Subject dropdown not populated, trying again...");

      if (!user) {
        user = await getUserValue();
        // console.log("User initialized in backup:", user);
      }

      await populateSubjectDropdown();
    }
  } catch (error) {
    console.error("Error during backup initialization:", error);
  }
});

// Debug: Log when the script loads
// console.log("ncmentry.mjs script loaded at:", new Date().toISOString());

// Make functions available globally for debugging
// window.debugSubjects = {
//   fetchSubjects,
//   populateSubjectDropdown,
//   getHardcodedSubjects,
// };

// Setup form submission handler
function setupFormHandler() {
  const form = document.querySelector("#ncmform");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nextId = await fetch(url + "/nextId", { method: "GET" })
      .then((response) => response.json())
      .then((data) => {
        JSON.stringify(data);
        return data;
      });

    const dataJson = {
      NCM_ID: nextId,
      CREATE_DATE: new Date().toISOString(),
      CREATE_BY: user,
      CLOSED: "N",
    };
    for (let field of data.keys()) {
      switch (field) {
        case "PEOPLE_ID":
          dataJson[field] = data.get(field).toUpperCase();
          break;
        case "ASSIGNED_TO":
          dataJson[field] = data.get(field).toUpperCase();
          break;
        case "SUBJECT":
          dataJson[field] = data.get(field).toUpperCase();
          if (dataJson[field] === " " || dataJson[field] === "") {
            dataJson[field] = "TBD";
          }
          break;
        case "PROJECT_ID":
          dataJson[field] = data.get(field).toUpperCase();
          break;
        default:
          if (field[field.length - 4] === "_DATE") {
            let myDate = data.get(field);
            myDate = myDate.slice(0, 10);
            dataJson[field] = myDate;
            // break;
          } else {
            dataJson[field] = data.get(field);
          }
      }
    }

    try {
      await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataJson),
      });
      // console.log('Success:', JSON.stringify(dataJson));
    } catch (err) {
      console.log("Error:", err);
    }

    // Try to send email and notify, then redirect
    (async () => {
      let toEmail;
      if (dataJson.NCM_TYPE === "RET") {
        toEmail = users["QC"];
      }
      if (!toEmail && dataJson.ASSIGNED_TO) {
        toEmail = users[dataJson.ASSIGNED_TO];
      }
      if (toEmail === undefined) {
        toEmail = users["DEFAULT"];
      }
      const emailData = {
        NCM_ID: nextId,
        CREATE_BY: user,
        SUBJECT: dataJson.SUBJECT,
        PEOPLE_ID: dataJson.PEOPLE_ID,
        ASSIGNED_TO_EMAIL: toEmail,
        DESCRIPTION: dataJson.DESCRIPTION,
        PRODUCT_ID: dataJson.PRODUCT_ID,
      };
      try {
        const response = await fetch(url + "/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailData),
        });
        if (response.ok) {
          await fetch(url + "/ncm_notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ACTION: "I",
              NCM_ID: nextId,
              ASSIGNED_TO: dataJson.ASSIGNED_TO,
            }),
          });
        } else {
          throw new Error("Failed to send ncm email");
        }
      } catch (err) {
        console.log("Error sending email or notifying:", err);
      }
      form.reset();
      // Set default values
      initializeDefaults();
      window.location.href = "ncms.html";
    })();
  });
}
