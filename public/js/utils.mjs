// import { dotenv } from "../../node_modules/dotenv";
// dotenv.config();

async function loadTemplate(path) {
  const res = await fetch(path);
  const template = await res.text();
  return template;
}

export function renderWithTemplate(
  template,
  parentElement,
  data,
  callback,
  position = "afterbegin"
) {
  if (parentElement) {
    parentElement.insertAdjacentHTML(position, template);
    if (callback) {
      callback(data);
    }
  } else {
    console.error("Parent element is null or undefined.");
  }
}

export function renderWithTemplate2(
  template,
  parentElement,
  data,
  callback,
  position = "afterbegin"
) {
  if (parentElement) {
    let output = template;
    for (const key in data) {
      const regex = new RegExp(`{{${key}}}`, "g");
      output = output.replace(regex, data[key]);
    }
    parentElement.insertAdjacentHTML(position, output);
  } else {
    console.error("Parent element is null or undefined.");
  }
}

export async function loadReports(data) {
  const main = document.querySelector("main");
  const reportsTemplate = await loadTemplate("/partials/report.html");
  for (const report of data) {
    renderWithTemplate2(reportsTemplate, main, report);
  }
}

export async function loadHeaderFooter() {
  const headerTemplate = await loadTemplate("/partials/header.html");
  const headerElement = document.querySelector("#header");
  let footerTemplate = await loadTemplate("/partials/footer.html");
  const footerElement = document.querySelector("#footer");
  const year = new Date().getFullYear();
  footerTemplate = footerTemplate.replace("{{year}}", year);

  renderWithTemplate(headerTemplate, headerElement);
  renderWithTemplate(footerTemplate, footerElement);

  // Initialize mobile navigation after header is loaded
  initializeMobileNav();

  // Setup authentication UI after header is loaded
  await setupAuthUI();
}

// Setup authentication-related UI elements
async function setupAuthUI() {
  try {
    const port = myport();
    const response = await fetch(`http://localhost:${port}/auth/status`, {
      credentials: "include",
    });

    if (response.ok) {
      const authData = await response.json();
      const loginLink = document.querySelector("#login");

      if (authData.loggedIn && loginLink) {
        // User is logged in, replace login link with logout
        loginLink.textContent = "Logout";
        loginLink.href = "#";
        loginLink.addEventListener("click", async (e) => {
          e.preventDefault();
          await logoutUser();
        });
      }
    }
  } catch (err) {
    console.error("Error setting up auth UI:", err);
  }
}

// Logout function
async function logoutUser() {
  try {
    const port = myport();
    const response = await fetch(`http://localhost:${port}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      window.location.href = `http://localhost:${port}/login.html`;
    }
  } catch (err) {
    console.error("Logout failed:", err);
  }
}

// Initialize mobile navigation functionality
function initializeMobileNav() {
  // Wait for DOM to be fully rendered
  setTimeout(() => {
    const navToggle = document.getElementById("nav-toggle");
    const navMenu = document.querySelector("#main-nav ul");

    if (navToggle && navMenu) {
      navToggle.addEventListener("click", function () {
        navMenu.classList.toggle("show");

        // Update button text and aria-expanded
        const isExpanded = navMenu.classList.contains("show");
        navToggle.setAttribute("aria-expanded", isExpanded);
        navToggle.textContent = isExpanded ? "✕ Close" : "☰ Menu";
      });

      // Close menu when clicking outside
      document.addEventListener("click", function (event) {
        if (
          !navToggle.contains(event.target) &&
          !navMenu.contains(event.target)
        ) {
          navMenu.classList.remove("show");
          navToggle.setAttribute("aria-expanded", "false");
          navToggle.textContent = "☰ Menu";
        }
      });

      // Close menu when window is resized to larger screen
      window.addEventListener("resize", function () {
        if (window.innerWidth > 768) {
          navMenu.classList.remove("show");
          navToggle.setAttribute("aria-expanded", "false");
          navToggle.textContent = "☰ Menu";
        }
      });
    }
  }, 100);
}

// get user value from config.json file
export async function getUserValue() {
  const res = await fetch("../json/config.json");
  const data = await res.json();
  return data.username;
}

// get computer name from Windows environment variable
export function getUserValue1() {
  return process.env.COMPUTERNAME;
}

// return datetime in format YYYY-MM-DD HH:MM:SS
export function getDateTime() {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  return `${year}-${month}-${dayOfMonth} ${hours}:${minutes}:${seconds}`;
}

// return form fields for data entry
export function getFormFields(myform) {
  let data = [];
  switch (myform) {
    case "csr":
      data = ["CUSTOMER_ID", "UNIT", "VALUE"];
      for (entryfield in data) {
        console.log(entryfield);
      }
    case "output":
      return [
        "output_id",
        "output_name",
        "output_description",
        "output_date",
        "output_time",
      ];
    case "defect":
      return [
        "defect_id",
        "defect_name",
        "defect_description",
        "defect_date",
        "defect_time",
      ];
    case "user":
      return ["user_id", "user_name", "user_email", "user_password"];
    default:
      return [];
  }
  return data;
}

export async function createNotesSection(title, notes) {
  let notesSection = document.createElement("section");
  notesSection.classList.add("notesSection");
  let notesTitle = document.createElement("h3");
  let buttonid = "";
  let buttonText = "Edit";
  const note = document.createElement("p");
  let noteid = "note";
  notesTitle.classList.add("notesTitle");
  // switch case of title to display appropriate title
  switch (title) {
    case "INPUT_TEXT":
      notesTitle.textContent = "Action:";
      notesTitle.id = "actionTitle";
      buttonid = "editAction";
      buttonText = "Edit Action";
      noteid = "actionNote";
      break;
    case "FOLLOWUP_TEXT":
      notesTitle.textContent = "Follow Up:";
      notesTitle.id = "followUpTitle";
      buttonid = "editFollowUp";
      buttonText = "Follow Up";
      noteid = "followUpNote";
      break;
    case "RESPONSE_TEXT":
      notesTitle.textContent = "Response:";
      notesTitle.id = "responseTitle";
      buttonid = "editResponse";
      buttonText = "Respond";
      noteid = "responseNote";
      break;
    default:
      notesTitle.textContent = "Notes";
  }

  notesSection.appendChild(notesTitle);

  // append notes to notes section
  // if the length of notes replace new line characters with <br> tag
  if (notes) {
    notes = notes.replace(/\n/g, "<br>");
  }
  note.innerHTML = notes;
  note.id = noteid;
  notesSection.appendChild(note);

  // call createButton and append button to section
  createButton(notesSection, buttonText, buttonid, "editNoteButton");

  // // insert notes adjacent to #detailSection
  // const detailSection = document.querySelector("#detailSection");
  // detailSection.insertAdjacentElement("afterend", notesSection);

  // append notes section to main
  const main = document.querySelector("#main");
  main.appendChild(notesSection);
}

// append button to section
export function createButton(section, buttonName, buttonId, buttonClass) {
  let button = document.createElement("button");
  button.textContent = buttonName;
  button.id = buttonId;
  button.classList.add(buttonClass);
  button.type = "submit";
  section.appendChild(button);
}

export async function createSection(title, notes) {
  const sectionTemplate = await loadTemplate("/partials/section.html");
  const mainElement = document.querySelector("#main");
  const data = {
    title: title,
    notes: notes,
  };

  renderWithTemplate(sectionTemplate, mainElement, data);
}

export async function createReportTable() {
  const reportTableTemplate = await loadTemplate("/partials/reportTable.html");
  const mainElement = document.querySelector("#main");
  const data = {
    title: "Report Table",
  };

  renderWithTemplate(reportTableTemplate, mainElement, data);
}

export async function exesAndOhs(newResponse) {
  if (newResponse === null) {
    newResponse = "";
  } else {
    newResponse = newResponse;

    const regex = /scan/gi;
    if (newResponse.match(regex)) {
      newResponse = "X";
    } else if (newResponse.match(/not[e]{0,1} done/gi)) {
      newResponse = "O";
    } else if (newResponse.match(/got it/gi)) {
      newResponse = "X";
    } else if (newResponse.match(/on file/gi)) {
      newResponse = "X";
    } else if (newResponse.match(/implementing/gi)) {
      newResponse = "O";
    } else if (newResponse.match(/no record/gi)) {
      newResponse = "O";
    } else if (newResponse.match(/no use/gi)) {
      newResponse = "X";
    } else if (newResponse.match(/not being used/gi)) {
      newResponse = "X";
    } else if (newResponse.match(/Filed,/gi)) {
      newResponse = "X";
    } else {
      newResponse = newResponse;
    }
  }
  return newResponse;
}

export function myport() {
  return 3003;
}

// Determine document type
export function getDocType(docid) {
  let proposedDocType = "P";
  if (/F[0-9]{4}-[0-9]{1,2}/.test(docid)) {
    proposedDocType = "F";
  } else if (/(S|T)[0-9]{2}/.test(docid)) {
    proposedDocType = "F";
  } else if (/CI-WI-/.test(docid)) {
    proposedDocType = "W";
  }
  return proposedDocType;
}

// return the parameter date in a yyyy-mm-dd format
export function displayDate(date) {
  if (!date) {
    return "";
  }
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getEmail(user) {
  const email = user + "@example.com";
  return email;
}

// Move fetchAndParseXML to a separate utils file
export function fetchAndParseXML(filePath, searchKey, searchValue) {
  fetch(filePath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch the XML file.");
      }
      return response.text();
    })
    .then((xmlText) => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "application/xml");

      // Search for matching elements in the XML
      const elements = xmlDoc.getElementsByTagName(searchKey);
      let found = false;

      for (let i = 0; i < elements.length; i++) {
        if (elements[i].textContent === searchValue) {
          found = true;
          console.log("Match found:", elements[i].parentNode.outerHTML);
          break;
        }
      }

      if (!found) {
        console.log("No matching data found in the XML file.");
      }
    })
    .catch((error) => {
      console.error("Error processing XML:", error);
    });
}

// Get the certificate number from the XML file
export async function getCertNos(childWorkOrderNoValue) {
  const cert = { childlines: [] }; // Initialize the cert object with an empty lines array
  try {
    const workOrderNoValue = childWorkOrderNoValue.substring(0, 6); // Get the first 6 characters of the child WO value
    const xmlResponse = await fetchXML(workOrderNoValue); // Fetch the XML data
    const parsedData = parseXML(xmlResponse); // Parse the fetched XML data
    const crystalReport = parsedData.querySelector("CrystalReport");
    if (!crystalReport) {
      console.error("CrystalReport element not found in the parsed data.");
      return;
    }

    const details = crystalReport.querySelectorAll("Details");
    if (!details.length) {
      console.error("No Details elements found in the CrystalReport.");
      return;
    }

    const table = document.createElement("table");
    table.id = "xmlTable"; // Set an ID for the table if needed
    // table.border = "1";

    details.forEach((detail) => {
      const sections = detail.querySelectorAll("Section");
      sections.forEach((section) => {
        const line = {}; // Create a new line object for each section

        const fields = section.querySelectorAll("Field");
        fields.forEach((field) => {
          const name = field.getAttribute("Name");
          const formattedValue = field.querySelector("FormattedValue");
          const value = formattedValue ? formattedValue.textContent : "N/A";

          // Add the field to the line object
          if (name) {
            line[name] = value;
          }
        });
        let certno = line["SERIALNUMBER1"];
        // replace 'PO: ' with '' in certno
        certno = certno.replace("PO: ", "");
        // replace preceding zeros in certno
        certno = certno.replace(/^0+/, "");
        // if length is 5 or less, push to cert.lines array
        if (certno.length <= 5) {
          line["SERIALNUMBER1"] = certno; // Update the certno in the line object
          const isDuplicate = cert.childlines.some((existingLine) => {
            return JSON.stringify(existingLine) === JSON.stringify(line);
          });
          if (!isDuplicate) {
            cert.childlines.push(line);
          }
          return; // Skip to the next section
        } else {
          // push to lookup array
          cert.lookupchild = cert.lookupchild || []; // Initialize lookup array if not already done
          if (cert.lookupchild.length > 0) {
            const isDuplicate = cert.lookupchild.some((existingLine) => {
              return JSON.stringify(existingLine) === JSON.stringify(line);
            });
            if (!isDuplicate) {
              cert.lookupchild.push(line);
            }
          }
        }
      });
    });
  } catch (error) {
    console.error("Error fetching or parsing XML:", error);
  }
  // Remove duplicates from cert.childlines, ignoring differences in 'QUANTITY1'
  cert.childlines = cert.childlines.filter(
    (line, index, self) =>
      index ===
      self.findIndex((t) => {
        const { QUANTITY1: _, ...restT } = t;
        const { QUANTITY1: __, ...restLine } = line;
        return JSON.stringify(restT) === JSON.stringify(restLine);
      })
  );
  return cert; // Return the cert object containing lines and lookup arrays
}

// Helper functions
export async function fetchXML(workOrderNo) {
  const response = await fetch(`/data/${workOrderNo}.xml`);
  if (!response.ok) {
    throw new Error(`Failed to fetch XML: ${response.statusText}`);
  }
  return await response.text();
}

export function parseXML(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Error parsing XML");
  }
  return xmlDoc;
}

// Function to get details from the XML data
export async function getDetails(
  parsedData,
  childWorkOrderNoValue,
  workOrderNoValue
) {
  const cert = { lines: [] }; // Initialize the cert object with an empty lines array
  try {
    const crystalReport = parsedData.querySelector("CrystalReport");
    if (!crystalReport) {
      console.error("CrystalReport element not found in the parsed data.");
      return;
    }

    const details = crystalReport.querySelectorAll("Details");
    if (!details.length) {
      console.error("No Details elements found in the CrystalReport.");
      return;
    }

    details.forEach((detail) => {
      const sections = detail.querySelectorAll("Section");
      sections.forEach((section) => {
        const line = {}; // Create a new line object for each section

        const fields = section.querySelectorAll("Field");
        fields.forEach((field) => {
          const name = field.getAttribute("Name");
          const formattedValue = field.querySelector("FormattedValue");
          const value = formattedValue ? formattedValue.textContent : "N/A";

          // Add the field to the line object
          if (name) {
            line[name] = value;
          }
        });
        let certno = line["SERIALNUMBER1"];
        // replace 'PO: ' with '' in certno
        certno = certno.replace("PO: ", "");
        // replace preceding zeros in certno
        certno = certno.replace(/^0+/, "");
        // if length is 5 or less, push to cert.lines array
        if (certno.length <= 5) {
          line["SERIALNUMBER1"] = certno; // Update the certno in the line object
          const isDuplicate = cert.lines.some((existingLine) => {
            return JSON.stringify(existingLine) === JSON.stringify(line);
          });
          if (!isDuplicate) {
            cert.lines.push(line);
          }
          return; // Skip to the next section
        } else {
          // push to lookup array
          cert.lookup = cert.lookup || []; // Initialize lookup array if not already done
          if (cert.lookup.length > 0) {
            const isDuplicate = cert.lookup.some((existingLine) => {
              return JSON.stringify(existingLine) === JSON.stringify(line);
            });
            if (!isDuplicate) {
              cert.lookup.push(line);
            }
          }
        }
      });
    });
  } catch (error) {
    console.error("Error fetching or parsing XML:", error);
  }
  // Remove duplicates from cert.lines, ignoring differences in 'QUANTITY1'
  cert.lines = cert.lines.filter(
    (line, index, self) =>
      index ===
      self.findIndex((t) => {
        const { QUANTITY1: _, ...restT } = t;
        const { QUANTITY1: __, ...restLine } = line;
        return JSON.stringify(restT) === JSON.stringify(restLine);
      })
  );
  return cert; // Return the cert object containing lines and lookup arrays
}

// Render a section as an HTML table using the provided data and title
export function renderTableFromArray(data, title) {
  console.log("Data to render:", data);
  if (!Array.isArray(data) || !data.length) return "";

  // Determine if we need to add the Specification column
  const showSpecification = title !== "Raw Materials";

  let html = `<h3 class="textSubTitle">${title}</h3>
<table class="certtable">
  <thead>
    <tr>
      <th class="tight-cell w-32">Item</th>
      <th class="tight-cell">Part Number</th>`;
  if (showSpecification) {
    html += `<th class="tight-cell">Specification</th>`;
  }
  html += `<th class="tight-cell">Trace ID</th>
    </tr>
  </thead>
  <tbody>
`;

  data.forEach((line) => {
    html += `    <tr class="fontmed">
      <td class="py-4 w-32">${
        line.JOB ? line.JOB + (line.SUFFIX ? "-" + line.SUFFIX : "") : ""
      }</td>
      <td class="py-4">${line.part2 || line.PART || ""}</td>`;
    if (showSpecification) {
      let spec = "";
      if (line.OPERATION) {
        switch (line.OPERATION.trim()) {
          case "FT1C1A":
            spec = "MIL-DTL-5541 Type I Class 1A";
            break;
          case "FT1C3":
            spec = "MIL-DTL-5541 Type I Class 3";
            break;
          case "FT1C3A":
            spec = "MIL-DTL-5541 Type I Class 3A";
            break;
          case "FT2C1A":
            spec = "MIL-DTL-5541 Type II Class 1A";
            break;
          case "FT2C3":
            spec = "MIL-DTL-5541 Type II Class 3";
            break;
          case "HT61A":
            spec = "HEAT TREAT 6061 NON CLAD .032";
            break;
          case "HT61B":
            spec = "HEAT TREAT 6061 NON CLAD .064";
            break;
          case "HT61C":
            spec = "HEAT TREAT 6061 NON CLAD .091";
            break;
          case "HT75A":
            spec = "HEAT TREAT 7075 NON CLAD .033";
            break;
          case "HT75B":
            spec = "HEAT TREAT 7075 NON CLAD .064";
            break;
          case "HT75C":
            spec = "HEAT TREAT 7075 NON CLAD .091";
            break;
          case "HT75D":
            spec = "HEAT TREAT 7075 NON CLAD .126";
        }
      }
      if (spec === "") {
        spec = line.OPERATION || "";
      }
      html += `<td class="py-4">${spec}</td>`;
    }
    html += `<td class="py-4">${
      line.PURCHASE_ORDER || line.DATE_COMPLETED || ""
    }</td>
    </tr>
    `;
  });

  html += `  </tbody>
</table>
`;
  return html;
}
// =================================================
// timestamp new note and join to existing notes
export function timestampAndJoinNotes(existingNotes, newNote, user) {
  const timestamp = new Date().toLocaleString();
  let updatedNotes = `${timestamp} by ${user}:\n${newNote}\n`;
  if (existingNotes && existingNotes.trim() !== "") {
    updatedNotes += existingNotes.startsWith("---")
      ? existingNotes
      : "\n" + existingNotes;
  }
  return updatedNotes;
}
