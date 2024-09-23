async function loadTemplate(path) {
    const res = await fetch(path);
    const template = await res.text();
    return template;
  }

export function renderWithTemplate(template, parentElement, data, callback, position = "afterbegin"){
    if (parentElement) {
      parentElement.insertAdjacentHTML(position, template);
      if (callback) {
        callback(data);
      }
    } else {
      console.error("Parent element is null or undefined.");
    }
  }

export async function loadHeaderFooter(){
    const headerTemplate = await loadTemplate("/partials/header.html");
    const headerElement = document.querySelector("#header");
    const footerTemplate = await loadTemplate('/partials/footer.html');
    const footerElement = document.querySelector("#footer");
  
    renderWithTemplate(headerTemplate, headerElement);
    renderWithTemplate(footerTemplate, footerElement);
  }

  // get user value from config.json file
export async function getUserValue() {
    const res = await fetch("../js/config.json");
    const data = await res.json();
    return data.user;
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
        return ["output_id", "output_name", "output_description", "output_date", "output_time"];
      case "defect":
        return ["defect_id", "defect_name", "defect_description", "defect_date", "defect_time"];
      case "user":
        return ["user_id", "user_name", "user_email", "user_password"];
      default:
        return [];
    }
    return data;
  }

  export function createNotesSection(notes) {
    let notesSection = document.createElement("section");
    let notesTitle = document.createElement("h3");
    notesTitle.classList.add("notesTitle");
    // switch case of notes
    switch (notes) {
      case "INPUT_TEXT":
        notesTitle.textContent = "Action:";
        notesTitle.id = "actionTitle";
        break;
      case "FOLLOWUP_TEXT":
        notesTitle.textContent = "Follow Up";
        notesTitle.id = "followUpTitle";
        break;
      case "RESPONSE_TEXT":
        notesTitle.textContent = "Response";
        notesTitle.id = "responseTitle";
        break;
      default:
        notesTitle.textContent = "Notes";
    }

    notesSection.appendChild(notesTitle);


    if (notes.length > 0) {
      notesSection += "<h2>Notes</h2>";
      notesSection += "<ul>";
      notes.forEach((note) => {
        notesSection += `<li>${note}</li>`;
      });
      notesSection += "</ul>";
    }
    return notesSection;
  }