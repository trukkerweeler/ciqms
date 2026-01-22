// xcert.mjs - Frontend logic for xcert.html

const form = document.getElementById("xcert-form");
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
    const res = await fetch(`/xcert?baseWorkorder=${baseWorkorder}`);
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      resultsDiv.textContent = "No results found.";
      workingDiv.style.display = "none";
      return;
    }
    const table = document.createElement("table");
    table.innerHTML = `<thead><tr>
      <th>Part</th><th>JOB</th><th>SUFFIX</th><th>REFERENCE</th><th>DATE_COMPLETED</th>
    </tr></thead><tbody></tbody>`;
    data.forEach((row) => {
      const tr = document.createElement("tr");
      ["ROUTER", "JOB", "SUFFIX", "REFERENCE", "DATE_COMPLETED"].forEach(
        (key, idx) => {
          const td = document.createElement("td");
          let val = row[key] ?? "";
          if (key === "ROUTER") {
            // Trim, split on space, remove last element, rejoin, trim again
            let parts = val.trim().split(" ");
            if (parts.length > 1) {
              parts.pop();
              val = parts.join(" ").trim();
            } else {
              val = val.trim();
            }
          }
          td.textContent = val;
          tr.appendChild(td);
        },
      );
      table.querySelector("tbody").appendChild(tr);
    });
    resultsDiv.appendChild(table);
  } catch (err) {
    resultsDiv.textContent = "Error: " + err.message;
  } finally {
    workingDiv.style.display = "none";
  }
});
