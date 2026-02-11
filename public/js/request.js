import { loadHeaderFooter, getApiUrl, getSessionUser } from "./utils.mjs";
loadHeaderFooter();

let user = await getSessionUser();

let requestBy = document.getElementById("createby");
requestBy.value = user;

// Send a POST request
const form = document.querySelector("form");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const apiUrl = await getApiUrl();
  const url = `${apiUrl}/requests`;
  const nextId = await fetch(url + "/nextId", { method: "GET" })
    .then((response) => response.json())
    .then((data) => {
      JSON.stringify(data);
      return data;
    });
  console.log(nextId);
  const requestDate = new Date();
  requestDate.setDate(requestDate.getDate());
  let myRequestDate = requestDate.toISOString().slice(0, 19).replace("T", " ");

  const plus30date = new Date();
  plus30date.setDate(plus30date.getDate() + 30);
  let myDuedate = plus30date.toISOString().slice(0, 19).replace("T", " ");

  const dataJson = {
    REQUEST_ID: nextId,
    REQUEST_DATE: myRequestDate,
    DUE_DATE: myDuedate,
    CREATE_DATE: myRequestDate,
  };
  for (let field of data.keys()) {
    // if the field is 'CREATE_BY', change it to uppercase
    if (field === "CREATE_BY") {
      dataJson[field] = data.get(field).toUpperCase();
    } else dataJson[field] = data.get(field);
  }
  // console.log(dataJson);

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

  form.reset();
});
