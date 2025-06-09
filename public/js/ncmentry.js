
import { loadHeaderFooter, getUserValue, myport } from "./utils.mjs";
import users from "./users.mjs";
// import { exec } from 'child_process';
// import * as fs from 'node:fs/promises';
loadHeaderFooter();
const port = myport();

const url = `http://localhost:${port}/ncm`;
let user = await getUserValue();

let recordDate = new Date();
recordDate.setDate(recordDate.getDate());
// let recordDateTime = recordDate
recordDate = recordDate.toISOString().slice(0, 10);
const defaultNcmDate = document.getElementById("NCM_DATE");
defaultNcmDate.value = recordDate;

let myDueDateDefault = new Date();
myDueDateDefault.setDate(myDueDateDefault.getDate() + 14);
myDueDateDefault = myDueDateDefault.toISOString().slice(0, 10);
const defaultDueDate = document.getElementById("DUE_DATE");
defaultDueDate.value = myDueDateDefault;

const reqby = document.getElementById("reqby");
reqby.value = user;

const assto = document.getElementById("assto");
assto.value = "TKENT";

// Send a POST request
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

  setTimeout(async () => {
    // Try to send email
    let toEmail = users[dataJson.ASSIGNED_TO];
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
    await fetch(url + "/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    })
      .then(async (response) => {
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
          return response.text(); // Handle as plain text if not JSON
        }
        throw new Error("Failed to send ncm email");
      });
  });

  form.reset();
  // Set default values
  defaultNcmDate.value = recordDate;
  defaultDueDate.value = myDueDateDefault;
  window.location.href = "ncms.html";

});
