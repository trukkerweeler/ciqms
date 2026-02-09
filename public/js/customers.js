import { loadHeaderFooter, getApiUrl } from "./utils.mjs";
loadHeaderFooter();

const url = (async () => {
  const apiUrl = await getApiUrl();
  return `${apiUrl}/customer`;
})();

function getRecords() {
  const main = document.querySelector("main");

  fetch(url, { method: "GET" })
    .then((response) => response.json())
    .then((records) => {
      // console.log(records);
      let customerFieldList = [
        "CUSTOMER_ID",
        "NAME",
        "CITY",
        "STATE",
        "ZIP",
        "PHONE",
        "EMAIL",
      ];
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");
      const header = document.createElement("tr");
      const td = document.createElement("td");

      for (let key in records[0]) {
        if (customerFieldList.includes(key)) {
          const th = document.createElement("th");
          th.textContent = key;
          header.appendChild(th);
        }
      }
      thead.appendChild(header);

      for (let record of records) {
        const tr = document.createElement("tr");
        for (let key in record) {
          if (!customerFieldList.includes(key)) {
            continue;
          } else {
            const td = document.createElement("td");
            switch (key) {
              case "CUSTOMER_ID":
                // add a link to the record
                td.innerHTML = `<a href="#" id="showCustomerEdit">${record[key]}</a>`;
                break;
              default:
                td.textContent = record[key];
            }
            tr.appendChild(td);
          }
        }
        tbody.appendChild(tr);
      }

      table.appendChild(thead);
      table.appendChild(tbody);
      main.appendChild(table);

      // Add event listener to the table
      const showCustomerEdit = document.getElementById("showCustomerEdit");
      // listen for click events on the table
      showCustomerEdit.addEventListener("click", (event) => {
        event.preventDefault();
        const editCustomerDialog =
          document.getElementById("editCustomerDialog");
        editCustomerDialog.showModal();

        // fetch the record
        const customerId = event.target.textContent;
        fetch(`${url}/${customerId}`, { method: "GET" })
          .then((response) => response.json())
          .then((record) => {
            console.log(record);
            let firstrecord = record[0];
            // populate the form
            const form = document.getElementById("editCustomerForm");
            for (let key in firstrecord) {
              if (form.elements[key]) {
                form.elements[key].value = firstrecord[key];
              }
            }
          });

        // add event listener to the close button
        const close = document.getElementById("cancelEditCustomer");
        close.addEventListener("click", (event) => {
          editCustomerDialog.close();
        });

        // add event listener to the save button
        const save = document.getElementById("saveCustomerEdit");
        save.addEventListener("click", (event) => {
          // get the form data
          const form = document.getElementById("editCustomerForm");
          const formData = new FormData(form);
          const data = {};
          for (let key of formData.keys()) {
            data[key] = formData.get(key);
          }

          // send the data to the server
          fetch(`${url}/${customerId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          })
            .then((response) => response.json())
            .then((result) => {
              console.log(result);
              editCustomerDialog.close();
              // refresh the table
              main.innerHTML = "";
              getRecords();
            });
        });
      });
    });
}

getRecords();
