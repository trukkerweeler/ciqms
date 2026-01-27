// acert.mjs - Frontend logic for acert.html

const form = document.getElementById("acert-form");
const resultsDiv = document.getElementById("results");
const workingDiv = document.getElementById("working");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  resultsDiv.innerHTML = "";
  workingDiv.style.display = "block";
  const baseWorkorder = document.getElementById("baseWorkorder").value;
  if (!/^\d{6}$/.test(baseWorkorder)) {
    workingDiv.style.display = "none";
    resultsDiv.textContent = "Please enter a valid 6-digit workorder.";
    return;
  }
  try {
    // Call the new lineage endpoint
    const res = await fetch(`/acert/lineage/${baseWorkorder}`);
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      resultsDiv.textContent = "No results found.";
      workingDiv.style.display = "none";
      return;
    }
    // Display SERIAL_NUMBERs in a simple table
    const mainTable = document.createElement("table");
    mainTable.innerHTML = `<thead><tr><th>SERIAL_NUMBER</th></tr></thead><tbody></tbody>`;
    const serials = [];
    data.forEach((row) => {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.textContent = row.SERIAL_NUMBER || "";
      tr.appendChild(td);
      mainTable.querySelector("tbody").appendChild(tr);
      if (row.SERIAL_NUMBER) serials.push(row.SERIAL_NUMBER);
    });
    resultsDiv.appendChild(mainTable);

    // Define processes and display tables for each
    const processes = [
      { name: "HEAT", label: "Heat Treatment" },
      { name: "SWLD", label: "Spot Weld" },
      { name: "FWLD", label: "Fusion Weld" },
      { name: "PASS", label: "Passivation" },
      { name: "CHEM", label: "Chemical" },
      { name: "PAINT", label: "Paint" },
    ];

    for (const proc of processes) {
      // For PASS, create a simple passivation table for all serials
      if (proc.name === "PASS") {
        const passTable = document.createElement("table");
        passTable.innerHTML = `<thead><tr><th>Serial</th><th>Passivation Status</th></tr></thead><tbody></tbody>`;
        serials.forEach((serial) => {
          const tr = document.createElement("tr");
          const td1 = document.createElement("td");
          td1.textContent = serial;
          const td2 = document.createElement("td");
          td2.textContent = "Queried"; // Placeholder, will be replaced with real data if needed
          tr.appendChild(td1);
          tr.appendChild(td2);
          passTable.querySelector("tbody").appendChild(tr);
        });
        const label = document.createElement("h3");
        label.textContent = proc.label;
        resultsDiv.appendChild(label);
        resultsDiv.appendChild(passTable);
        continue;
      }
      // For other processes, POST to /acert/process for each serial
      const procTable = document.createElement("table");
      procTable.innerHTML = `<thead><tr><th>Serial</th><th>Operation</th><th>Job</th><th>Suffix</th><th>Description</th></tr></thead><tbody></tbody>`;
      const label = document.createElement("h3");
      label.textContent = proc.label;
      resultsDiv.appendChild(label);
      resultsDiv.appendChild(procTable);
      for (const serial of serials) {
        // POST to /acert/process
        try {
          const opRes = await fetch("/acert/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ process: proc.name, serial }),
          });
          if (!opRes.ok) throw new Error("Server error");
          const opData = await opRes.json();
          if (Array.isArray(opData) && opData.length > 0) {
            opData.forEach((row) => {
              const tr = document.createElement("tr");
              const td1 = document.createElement("td");
              td1.textContent = serial;
              const td2 = document.createElement("td");
              td2.textContent = row.OPERATION || "";
              const td3 = document.createElement("td");
              td3.textContent = row.JOB || "";
              const td4 = document.createElement("td");
              td4.textContent = row.SUFFIX || "";
              const td5 = document.createElement("td");
              td5.textContent = row.DESCRIPTION || "";
              tr.appendChild(td1);
              tr.appendChild(td2);
              tr.appendChild(td3);
              tr.appendChild(td4);
              tr.appendChild(td5);
              procTable.querySelector("tbody").appendChild(tr);
            });
          } else {
            const tr = document.createElement("tr");
            const td1 = document.createElement("td");
            td1.textContent = serial;
            const td2 = document.createElement("td");
            td2.colSpan = 4;
            td2.textContent = "No data";
            tr.appendChild(td1);
            tr.appendChild(td2);
            procTable.querySelector("tbody").appendChild(tr);
          }
        } catch (err) {
          const tr = document.createElement("tr");
          const td1 = document.createElement("td");
          td1.textContent = serial;
          const td2 = document.createElement("td");
          td2.colSpan = 4;
          td2.textContent = "Error: " + err.message;
          tr.appendChild(td1);
          tr.appendChild(td2);
          procTable.querySelector("tbody").appendChild(tr);
        }
      }
    }
  } catch (err) {
    resultsDiv.textContent = "Error: " + err.message;
  } finally {
    workingDiv.style.display = "none";
  }
});
