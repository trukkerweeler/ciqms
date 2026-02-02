// acert.mjs - Frontend logic for acert.html

const form = document.getElementById("acert-form");
const resultsDiv = document.getElementById("results");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  resultsDiv.innerHTML = "";
  // Show spinner
  const loadingIndicator = document.getElementById("loadingIndicator");
  const spinnerMsg = loadingIndicator.querySelector("p");
  loadingIndicator.style.display = "block";
  if (spinnerMsg) spinnerMsg.textContent = "Loading certificate data...";
  const startTime = performance.now();
  const baseWorkorder = document.getElementById("baseWorkorder").value;
  if (!/^\d{6}$/.test(baseWorkorder)) {
    loadingIndicator.style.display = "none";
    resultsDiv.textContent = "Please enter a valid 6-digit workorder.";
    return;
  }
  try {
    // Define processes and their operation codes (editable in future)
    const processes = [
      {
        name: "HEAT",
        label: "Heat Treatment",
        operationCodes: ["6061"],
      },
      {
        name: "SWLD",
        label: "Spot Weld",
        operationCodes: ["D172"],
      },
      {
        name: "FWLD",
        label: "Fusion Weld",
        operationCodes: ["FUSION", "D171"],
      },
      {
        name: "PASS",
        label: "Passivation",
        operationCodes: ["PASSM2", "PASST6"],
      },
      { name: "CHEM", label: "Chemical", operationCodes: ["FT1C1A"] },
      { name: "PAINT", label: "Paint", operationCodes: ["23377A", "PAINT2"] },
    ];

    for (const proc of processes) {
      try {
        const opRes = await fetch("/acert/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseWorkorder,
            operationCodes: proc.operationCodes,
          }),
        });
        if (!opRes.ok) throw new Error("Server error");
        const opData = await opRes.json();
        if (Array.isArray(opData) && opData.length > 0) {
          const procTable = document.createElement("table");
          procTable.style.width = "900px";
          procTable.innerHTML = `<thead><tr><th>#</th><th>Router</th><th>Operation</th><th>Description</th><th>Traceability</th></tr></thead><tbody></tbody>`;
          const label = document.createElement("h3");
          label.textContent = proc.label;
          resultsDiv.appendChild(label);
          resultsDiv.appendChild(procTable);
          opData.forEach((row, idx) => {
            const tr = document.createElement("tr");
            // #
            const tdNum = document.createElement("td");
            tdNum.textContent = idx + 1;
            // Router (split on space, 0th item)
            const tdRouter = document.createElement("td");
            tdRouter.textContent = (row.ROUTER || "").split(" ")[0];
            // Operation
            const tdOp = document.createElement("td");
            tdOp.textContent = row.OPERATION || "";
            // Description
            const tdDesc = document.createElement("td");
            tdDesc.textContent = row.DESCRIPTION || "";
            // Traceability (YYMMDD) + (JOB-SUFFIX)
            const tdTrace = document.createElement("td");
            let trace = "";
            if (row.DATE_COMPLETED) {
              const d = new Date(row.DATE_COMPLETED);
              if (!isNaN(d)) {
                const yy = String(d.getFullYear()).slice(-2);
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                trace = `${yy}${mm}${dd}`;
              } else {
                trace = row.DATE_COMPLETED;
              }
            }
            if (row.JOB && row.SUFFIX) {
              trace += ` (${row.JOB}-${row.SUFFIX})`;
            }
            tdTrace.textContent = trace;
            tr.appendChild(tdNum);
            tr.appendChild(tdRouter);
            tr.appendChild(tdOp);
            tr.appendChild(tdDesc);
            tr.appendChild(tdTrace);
            procTable.querySelector("tbody").appendChild(tr);
          });
        }
        // If no data, do not render anything for this process
      } catch (err) {
        // Optionally, show error only if you want to debug
        // const tr = document.createElement("tr");
        // const td = document.createElement("td");
        // td.colSpan = 5;
        // td.textContent = "Error: " + err.message;
        // tr.appendChild(td);
        // procTable.querySelector("tbody").appendChild(tr);
      }
    }
  } catch (err) {
    resultsDiv.textContent = "Error: " + err.message;
  } finally {
    // Calculate elapsed time
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
    if (spinnerMsg)
      spinnerMsg.textContent = `Query completed in ${elapsed} seconds.`;
    setTimeout(() => {
      loadingIndicator.style.display = "none";
      if (spinnerMsg) spinnerMsg.textContent = "Loading certificate data...";
    }, 1500);
  }
});
