import { loadHeaderFooter, getUserValue, myport } from "./utils.mjs";
const port = myport() || 3003; // Default port if not set

// ========== REVISION TRACKING HELPERS ==========
let currentWoNo = "";
let currentRevisionData = {};

function openEditDialog(section, serialNumber, rowData) {
  currentRevisionData = {
    type: "edit",
    section,
    serialNumber,
    rowData,
  };
  document.getElementById("editSection").value = section;
  document.getElementById("editRowData").value = JSON.stringify(
    rowData,
    null,
    2
  );
  document.getElementById("editNotes").value = "";
  document.getElementById("editDialog").showModal();
}

function openDeleteDialog(section, serialNumber, rowData) {
  currentRevisionData = {
    type: "delete",
    section,
    serialNumber,
    rowData,
  };
  document.getElementById("deleteSection").value = section;
  document.getElementById("deleteRowData").value = JSON.stringify(
    rowData,
    null,
    2
  );
  document.getElementById("deleteNotes").value = "";
  document.getElementById("deleteDialog").showModal();
}

async function saveRevision(type, notes) {
  const endpoint = `/cert/revision/${type === "edit" ? "edit" : "delete"}`;
  const payload = {
    woNo: currentWoNo,
    section: currentRevisionData.section,
    serialNumber: currentRevisionData.serialNumber,
    originalData: currentRevisionData.rowData,
    notes: notes,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User": getUserValue(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to save revision: ${response.statusText}`);
    }

    const data = await response.json();
    alert(
      `${type === "edit" ? "Edit" : "Delete"} recorded successfully (ID: ${
        data.revisionId
      })`
    );

    // Close dialogs
    document.getElementById("editDialog").close();
    document.getElementById("deleteDialog").close();
  } catch (error) {
    console.error("Error saving revision:", error);
    alert("Failed to save revision. Please try again.");
  }
}

let currentAddSection = "";

// Define form fields for each section
const sectionFormFields = {
  RM: [
    { name: "job", label: "Item", type: "text", required: true },
    { name: "part2", label: "Part Number", type: "text", required: true },
    { name: "serialNumber", label: "Trace ID", type: "text", required: true },
  ],
  CHEM: [
    { name: "job", label: "Item", type: "text", required: true },
    { name: "part", label: "Part Number", type: "text", required: true },
    { name: "operation", label: "Specification", type: "text", required: true },
    { name: "serialNumber", label: "Trace ID", type: "text", required: false },
  ],
  FUSION: [
    { name: "job", label: "Item", type: "text", required: true },
    { name: "part", label: "Part Number", type: "text", required: true },
    { name: "operation", label: "Specification", type: "text", required: true },
    { name: "serialNumber", label: "Trace ID", type: "text", required: false },
  ],
  SPOT: [
    { name: "job", label: "Item", type: "text", required: true },
    { name: "part", label: "Part Number", type: "text", required: true },
    { name: "operation", label: "Specification", type: "text", required: true },
    { name: "serialNumber", label: "Trace ID", type: "text", required: false },
  ],
  HEAT: [
    { name: "job", label: "Item", type: "text", required: true },
    { name: "part", label: "Part Number", type: "text", required: true },
    { name: "operation", label: "Specification", type: "text", required: true },
    { name: "serialNumber", label: "Trace ID", type: "text", required: false },
  ],
};

function openAddDialog(section) {
  currentAddSection = section;
  document.getElementById("addSectionName").textContent = section;

  const formFields = document.getElementById("addFormFields");
  formFields.innerHTML = "";

  const fields = sectionFormFields[section] || [];
  fields.forEach((field) => {
    const div = document.createElement("div");
    div.className = "form-group";

    const label = document.createElement("label");
    label.htmlFor = `add_${field.name}`;
    label.textContent = field.label + (field.required ? " *" : "");
    div.appendChild(label);

    const input = document.createElement("input");
    input.type = field.type;
    input.id = `add_${field.name}`;
    input.name = field.name;
    input.required = field.required;
    input.style.width = "100%";
    input.style.padding = "0.5rem";
    input.style.border = "1px solid #ccc";
    input.style.borderRadius = "4px";
    div.appendChild(input);

    formFields.appendChild(div);
  });

  document.getElementById("addDialog").showModal();
}

async function saveNewRow() {
  const fields = sectionFormFields[currentAddSection] || [];
  const rowData = {};

  for (const field of fields) {
    const input = document.getElementById(`add_${field.name}`);
    if (field.required && !input.value.trim()) {
      alert(`${field.label} is required`);
      return;
    }
    rowData[field.name] = input.value.trim();
  }

  try {
    const response = await fetch(`/cert/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User": getUserValue(),
      },
      body: JSON.stringify({
        woNo: currentWoNo,
        section: currentAddSection,
        rowData: rowData,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save row: ${response.statusText}`);
    }

    const data = await response.json();
    alert(
      `Row added successfully (ID: ${data.certAddId}). Status: PENDING approval`
    );
    document.getElementById("addDialog").close();
    // Optionally refresh to show new row
  } catch (error) {
    console.error("Error saving new row:", error);
    alert("Failed to save row. Please try again.");
  }
}

function createActionCell(section, serialNumber, rowData) {
  const td = document.createElement("td");
  td.className = "revision-actions";

  const btnEdit = document.createElement("button");
  btnEdit.type = "button";
  btnEdit.className = "btn-edit";
  btnEdit.textContent = "Edit";
  btnEdit.onclick = () => openEditDialog(section, serialNumber, rowData);

  const btnDelete = document.createElement("button");
  btnDelete.type = "button";
  btnDelete.className = "btn-delete";
  btnDelete.textContent = "Delete";
  btnDelete.onclick = () => openDeleteDialog(section, serialNumber, rowData);

  td.appendChild(btnEdit);
  td.appendChild(btnDelete);
  return td;
}

// ========== DIALOG EVENT LISTENERS ==========
document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const notes = document.getElementById("editNotes").value.trim();
  if (!notes) {
    alert("Please enter a reason for the change.");
    return;
  }
  await saveRevision("edit", notes);
});

document.getElementById("deleteForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const notes = document.getElementById("deleteNotes").value.trim();
  if (!notes) {
    alert("Please enter a reason for the deletion.");
    return;
  }
  await saveRevision("delete", notes);
});

// Close button handlers
document.querySelectorAll(".close-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.target.closest("dialog").close();
  });
});

document.getElementById("editCancel").addEventListener("click", () => {
  document.getElementById("editDialog").close();
});

document.getElementById("deleteCancel").addEventListener("click", () => {
  document.getElementById("deleteDialog").close();
});

document.getElementById("addForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await saveNewRow();
});

document.getElementById("addCancel").addEventListener("click", () => {
  document.getElementById("addDialog").close();
});

btnSearch.addEventListener("click", async function (event) {
  event.preventDefault();

  let woNumber = woNo.value.trim();
  if (!woNumber) {
    console.error("Work Order No is empty");
    return;
  }

  currentWoNo = woNumber; // Store for revision tracking

  // Show loading indicator
  const loadingIndicator = document.getElementById("loadingIndicator");
  // console.log("Loading indicator element:", loadingIndicator);
  if (loadingIndicator) {
    loadingIndicator.style.display = "flex";
    // console.log("Loading indicator shown");
  } else {
    // console.error("Loading indicator element not found!");
  }

  // Clear all result containers before new search
  const resultContainers = [
    "trace",
    "chem",
    "spot",
    "fusion",
    "heat",
    "paint",
    "cert-trace",
  ];
  resultContainers.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });

  // Use window.location.hostname to avoid hardcoding 'localhost'
  const url = `http://${window.location.hostname}:${port}/cert/${woNumber}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }

    const data = await response.json();
    const trace = document.getElementById("trace");
    let RM = [];
    const enteredWo = document.createElement("h2");
    enteredWo.textContent = `Work Order No: ${woNumber}`;
    trace.appendChild(enteredWo);

    // Only push RM items from the main data here, ensuring uniqueness
    const rmSet = new Set();
    data.forEach((item) => {
      let prodLine = item["PRODUCT_LINE"].trim();
      if (prodLine === "RM") {
        const job =
          (item["JOB"] ? item["JOB"].trim() : "") +
          (item["SUFFIX"] ? `-${item["SUFFIX"].trim()}` : "");
        const part = item["PART"] ? item["PART"].trim() : "";
        const part2 = item["PART2"] ? item["PART2"].trim() : "";
        let serialNumber = item["SERIAL_NUMBER"]
          ? item["SERIAL_NUMBER"].trim()
          : "";
        // Remove "PO: 00" prefix if present
        if (serialNumber.startsWith("PO: 00")) {
          serialNumber = serialNumber.replace(/^PO: 00/, "");
        }
        const key = [job, part, part2, serialNumber].join("|");
        if (!rmSet.has(key)) {
          rmSet.add(key);
          RM.push({ job, part, part2, serialNumber });
        }
      }
    });

    // Wait for all detail fetches to complete before displaying RM items
    await Promise.all(
      data.map((item) => {
        let serialNumber = item["SERIAL_NUMBER"]
          ? item["SERIAL_NUMBER"].trim()
          : "";
        if (/^\d{6}-\d{3}$/.test(serialNumber)) {
          return fetch(
            `http://${window.location.hostname}:${port}/cert/detail/${serialNumber}`
          )
            .then((res) => {
              if (!res.ok) throw new Error("Detail fetch failed");
              return res.json();
            })
            .then((detailData) => {
              if (detailData && detailData.length > 0) {
                detailData.forEach((detail) => {
                  if (
                    detail.PRODUCT_LINE === "RM" &&
                    !(detail.PART2 && detail.PART2.trim().startsWith("SWC"))
                  ) {
                    let ddSerialNumber = detail.SERIAL_NUMBER
                      ? detail.SERIAL_NUMBER.trim()
                      : "";
                    // Remove "PO: 00" prefix if present
                    if (ddSerialNumber.startsWith("PO: 00")) {
                      ddSerialNumber = ddSerialNumber.replace(/^PO: 00/, "");
                    }
                    const job =
                      (detail.JOB ? detail.JOB.trim() : "") +
                      (detail.SUFFIX ? `-${detail.SUFFIX.trim()}` : "");
                    const part = detail.PART ? detail.PART.trim() : "";
                    const part2 = detail.PART2 ? detail.PART2.trim() : "";
                    const key = [job, part, part2, ddSerialNumber].join("|");
                    if (!rmSet.has(key)) {
                      rmSet.add(key);
                      RM.push({
                        job,
                        part,
                        part2,
                        serialNumber: ddSerialNumber,
                      });
                    }
                  }
                });
              }
            })
            .catch((err) => {
              console.error("Error fetching detail data:", err);
            });
        }
        return Promise.resolve();
      })
    );
    // Display RM items in a table after all detail fetches are done
    if (RM.length > 0) {
      const table = document.createElement("table");
      table.style.width = "100%";
      table.border = "1";

      // Create and append table title
      const title = document.createElement("h3");
      title.textContent = "RAW MATERIALS";
      trace.appendChild(title);

      // Create table header
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");

      const thJob = document.createElement("th");
      thJob.textContent = "Item";
      headerRow.appendChild(thJob);

      const thPart2 = document.createElement("th");
      thPart2.textContent = "Part Number";
      headerRow.appendChild(thPart2);

      const thSerial = document.createElement("th");
      thSerial.textContent = "Trace ID";
      headerRow.appendChild(thSerial);

      const thActions = document.createElement("th");
      thActions.textContent = "Actions";
      thActions.style.textAlign = "center";
      headerRow.appendChild(thActions);

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Create table body
      const tbody = document.createElement("tbody");
      RM.forEach((item) => {
        const row = document.createElement("tr");

        const tdJob = document.createElement("td");
        tdJob.textContent = item.job;
        row.appendChild(tdJob);

        const tdPart2 = document.createElement("td");
        tdPart2.textContent = item.part2;
        row.appendChild(tdPart2);

        let serialNumber = item.serialNumber || "";
        // Remove "PO: 00" prefix if present (extra safety)
        if (serialNumber.startsWith("PO: 00")) {
          serialNumber = serialNumber.replace(/^PO: 00/, "");
        }
        const tdSerial = document.createElement("td");
        tdSerial.textContent = serialNumber;
        row.appendChild(tdSerial);

        // Add Actions column
        const actionCell = createActionCell("RM", serialNumber, item);
        row.appendChild(actionCell);

        tbody.appendChild(row);
      });
      table.appendChild(tbody);

      trace.appendChild(table);
    } else {
      const title = document.createElement("h3");
      title.textContent = "RAW MATERIALS";
      trace.appendChild(title);

      const noDataDiv = document.createElement("div");
      noDataDiv.style.padding = "1rem";
      noDataDiv.style.textAlign = "center";
      noDataDiv.innerHTML = "<p>No RM items found.</p>";

      const btnAdd = document.createElement("button");
      btnAdd.type = "button";
      btnAdd.className = "btn-primary";
      btnAdd.textContent = "+ Add RM Row";
      btnAdd.style.marginTop = "0.5rem";
      btnAdd.onclick = () => openAddDialog("RM");
      noDataDiv.appendChild(btnAdd);

      trace.appendChild(noDataDiv);
    }
    // }

    // --- Collect CHEM, FWLD, SWLD, HEAT arrays ---
    let CHEM = [];
    let FWLD = [];
    let SWLD = [];
    let HEAT = [];

    const serialNumbers = data
      .map((item) => item["SERIAL_NUMBER"] && item["SERIAL_NUMBER"].trim())
      .filter((sn) => /^\d{6}-\d{3}$/.test(sn));

    // Collect process data for each serial number
    for (const serialNumber of serialNumbers) {
      try {
        const procResponse = await fetch(
          `http://${
            window.location.hostname
          }:${port}/cert/processes/${encodeURIComponent(serialNumber)}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        if (!procResponse.ok) {
          throw new Error("Failed to fetch processes for " + serialNumber);
        }
        const procData = await procResponse.json();
        if (procData && procData.length > 0) {
          procData.forEach((proc) => {
            const op =
              proc.OPERATION && typeof proc.OPERATION.trim === "function"
                ? proc.OPERATION.trim()
                : proc.OPERATION || "";
            if (
              op === "FT1C3A" ||
              op === "FT1C1A" ||
              op === "FT1C3" ||
              op === "FT2C3" ||
              op === "FT2C1A"
            ) {
              CHEM.push(proc);
            } else if (
              op === "FUSION" ||
              op === "D171C" ||
              op === "D17.1" ||
              op === "D171C"
            ) {
              FWLD.push(proc);
            } else if (op === "SPOTW") {
              SWLD.push(proc);
            } else if (
              op.includes("HT") ||
              op.includes("6061") ||
              op.includes("HT2")
            ) {
              HEAT.push(proc);
            }
          });
        }
      } catch (err) {
        console.error("Error fetching processes for", serialNumber, err);
      }
    }
    // Remove duplicates from CHEM, FWLD, SWLD, HEAT based on JOB, SUFFIX, PART, SERIAL_NUMBER
    const uniqueCHEM = [];
    const uniqueFWLD = [];
    const uniqueSWLD = [];
    const uniqueHEAT = [];
    const seenChem = new Set();
    const seenFwld = new Set();
    const seenSwld = new Set();
    const seenHeat = new Set();
    for (const item of CHEM) {
      const key = [
        item.JOB ? item.JOB.trim() : "",
        item.SUFFIX ? item.SUFFIX.trim() : "",
        item.PART ? item.PART.trim() : "",
        item.SERIAL_NUMBER ? item.SERIAL_NUMBER.trim() : "",
      ].join("|");
      if (!seenChem.has(key)) {
        seenChem.add(key);
        uniqueCHEM.push(item);
      }
    }
    for (const item of FWLD) {
      const key = [
        item.JOB ? item.JOB.trim() : "",
        item.SUFFIX ? item.SUFFIX.trim() : "",
        item.PART ? item.PART.trim() : "",
        item.SERIAL_NUMBER ? item.SERIAL_NUMBER.trim() : "",
      ].join("|");
      if (!seenFwld.has(key)) {
        seenFwld.add(key);
        uniqueFWLD.push(item);
      }
    }
    for (const item of SWLD) {
      const key = [
        item.JOB ? item.JOB.trim() : "",
        item.SUFFIX ? item.SUFFIX.trim() : "",
        item.PART ? item.PART.trim() : "",
        item.SERIAL_NUMBER ? item.SERIAL_NUMBER.trim() : "",
      ].join("|");
      if (!seenSwld.has(key)) {
        seenSwld.add(key);
        uniqueSWLD.push(item);
      }
    }
    for (const item of HEAT) {
      const key = [
        item.JOB ? item.JOB.trim() : "",
        item.SUFFIX ? item.SUFFIX.trim() : "",
        item.PART ? item.PART.trim() : "",
        item.SERIAL_NUMBER ? item.SERIAL_NUMBER.trim() : "",
      ].join("|");
      if (!seenHeat.has(key)) {
        seenHeat.add(key);
        uniqueHEAT.push(item);
      }
    }
    // Assign the unique arrays back to the original variables
    CHEM = uniqueCHEM;
    FWLD = uniqueFWLD;
    SWLD = uniqueSWLD;
    HEAT = uniqueHEAT;

    // --- Render CHEMICAL TREATMENT table ---
    if (CHEM.length > 0) {
      const chemTable = document.createElement("table");
      chemTable.style.width = "100%";
      chemTable.border = "1";

      const chemTitle = document.createElement("h3");
      chemTitle.textContent = "CHEMICAL TREATMENT";
      trace.appendChild(chemTitle);

      const chemThead = document.createElement("thead");
      const chemHeaderRow = document.createElement("tr");
      ["Item", "Part Number", "Specification", "Trace ID", "Actions"].forEach(
        (txt) => {
          const th = document.createElement("th");
          th.textContent = txt;
          if (txt === "Actions") th.style.textAlign = "center";
          chemHeaderRow.appendChild(th);
        }
      );
      chemThead.appendChild(chemHeaderRow);
      chemTable.appendChild(chemThead);

      const chemTbody = document.createElement("tbody");
      for (const item of CHEM) {
        const row = document.createElement("tr");

        const tdJob = document.createElement("td");
        tdJob.textContent =
          (item.JOB ? item.JOB.trim() : "") +
          (item.SUFFIX ? `-${item.SUFFIX.trim()}` : "");
        row.appendChild(tdJob);

        const tdPart2 = document.createElement("td");
        tdPart2.textContent = item.PART ? item.PART.trim() : "";
        row.appendChild(tdPart2);

        // Specification column
        const tdSpec = document.createElement("td");
        let spec = "";
        if (item.OPERATION) {
          switch (item.OPERATION) {
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
          }
        }
        tdSpec.textContent = spec;
        row.appendChild(tdSpec);

        const tdSerial = document.createElement("td");
        const chemSerial = item.SERIAL_NUMBER ? item.SERIAL_NUMBER.trim() : "";
        if (chemSerial === "") {
          try {
            const job = item.JOB ? item.JOB.trim() : "";
            const suffix = item.SUFFIX ? item.SUFFIX.trim() : "";
            const lineRouter = item.LINE_ROUTER ? item.LINE_ROUTER.trim() : "";
            let jobString = job;
            if (suffix) jobString += `-${suffix}`;
            if (lineRouter) jobString += `-${lineRouter}`;
            const poResponse = await fetch(
              `http://${
                window.location.hostname
              }:${port}/cert/certpurchase/${encodeURIComponent(jobString)}`
            );
            if (poResponse.ok) {
              const poData = await poResponse.json();
              if (poData && poData[0].PURCHASE_ORDER) {
                tdSerial.textContent = poData[0].PURCHASE_ORDER.trim();
              } else {
                tdSerial.textContent = "";
              }
            } else {
              tdSerial.textContent = "";
            }
          } catch (err) {
            tdSerial.textContent = "";
          }
        } else {
          tdSerial.textContent = chemSerial;
        }
        if (tdSerial.textContent !== "") {
          while (tdSerial.textContent.charAt(0) === "0") {
            tdSerial.textContent = tdSerial.textContent.substring(1);
          }
        }
        row.appendChild(tdSerial);

        // Add Actions column
        const actionCell = createActionCell(
          "CHEM",
          item.SERIAL_NUMBER?.trim(),
          {
            job: item.JOB?.trim(),
            part: item.PART?.trim(),
            operation: item.OPERATION?.trim(),
            serialNumber: item.SERIAL_NUMBER?.trim(),
          }
        );
        row.appendChild(actionCell);

        chemTbody.appendChild(row);
      }
      chemTable.appendChild(chemTbody);
      trace.appendChild(chemTable);
    } else {
      const chemTitle = document.createElement("h3");
      chemTitle.textContent = "CHEMICAL TREATMENT";
      trace.appendChild(chemTitle);

      const noDataDiv = document.createElement("div");
      noDataDiv.style.padding = "1rem";
      noDataDiv.style.textAlign = "center";
      noDataDiv.innerHTML = "<p>No chemical treatment items found.</p>";

      const btnAdd = document.createElement("button");
      btnAdd.type = "button";
      btnAdd.className = "btn-primary";
      btnAdd.textContent = "+ Add CHEM Row";
      btnAdd.style.marginTop = "0.5rem";
      btnAdd.onclick = () => openAddDialog("CHEM");
      noDataDiv.appendChild(btnAdd);

      trace.appendChild(noDataDiv);
    }

    // --- Render FUSION WELDING table ---
    if (FWLD.length > 0) {
      const fwldTable = document.createElement("table");
      fwldTable.style.width = "100%";
      fwldTable.border = "1";

      const fwldTitle = document.createElement("h3");
      fwldTitle.textContent = "FUSION WELDING";
      trace.appendChild(fwldTitle);

      const fwldThead = document.createElement("thead");
      const fwldHeaderRow = document.createElement("tr");
      ["Item", "Part Number", "Specification", "Trace ID", "Actions"].forEach(
        (txt) => {
          const th = document.createElement("th");
          th.textContent = txt;
          if (txt === "Actions") th.style.textAlign = "center";
          fwldHeaderRow.appendChild(th);
        }
      );
      fwldThead.appendChild(fwldHeaderRow);
      fwldTable.appendChild(fwldThead);

      const fwldTbody = document.createElement("tbody");
      for (const item of FWLD) {
        const row = document.createElement("tr");

        const tdJob = document.createElement("td");
        tdJob.textContent =
          (item.JOB ? item.JOB.trim() : "") +
          (item.SUFFIX ? `-${item.SUFFIX.trim()}` : "");
        row.appendChild(tdJob);

        const tdPart2 = document.createElement("td");
        tdPart2.textContent = item.PART ? item.PART.trim() : "";
        row.appendChild(tdPart2);

        // Specification column
        const tdSpec = document.createElement("td");
        let spec = "";
        if (
          item.TEXT &&
          typeof item.TEXT === "string" &&
          item.TEXT.includes("8604")
        ) {
          spec = "MIL-W-8604";
        }
        tdSpec.textContent = spec;
        row.appendChild(tdSpec);

        const tdSerial = document.createElement("td");
        let serial = item.SERIAL_NUMBER ? item.SERIAL_NUMBER.trim() : "";
        if (!serial) {
          try {
            const job = item.JOB ? item.JOB.trim() : "";
            const suffix = item.SUFFIX ? item.SUFFIX.trim() : "";
            const lineRouter = item.LINE_ROUTER ? item.LINE_ROUTER.trim() : "";
            let jobString = job;
            if (suffix) jobString += `-${suffix}`;
            if (lineRouter) jobString += `-${lineRouter}`;
            const poResponse = await fetch(
              `http://${
                window.location.hostname
              }:${port}/cert/fwld/${encodeURIComponent(jobString)}`
            );
            if (poResponse.ok) {
              const poData = await poResponse.json();
              if (poData && poData[0].PURCHASE_ORDER) {
                serial = poData[0].PURCHASE_ORDER.trim();
              } else if (poData && poData[0].DATE_COMPLETED) {
                serial = poData[0].DATE_COMPLETED.trim();
              }
            }
          } catch (err) {
            // ignore error, leave serial empty
          }
        }
        tdSerial.textContent = serial;
        row.appendChild(tdSerial);

        // Add Actions column
        const actionCell = createActionCell(
          "FUSION",
          item.SERIAL_NUMBER?.trim(),
          {
            job: item.JOB?.trim(),
            part: item.PART?.trim(),
            operation: item.OPERATION?.trim(),
            serialNumber: item.SERIAL_NUMBER?.trim(),
          }
        );
        row.appendChild(actionCell);

        fwldTbody.appendChild(row);
      }
      fwldTable.appendChild(fwldTbody);
      trace.appendChild(fwldTable);
    } else {
      const fwldTitle = document.createElement("h3");
      fwldTitle.textContent = "FUSION WELDING";
      trace.appendChild(fwldTitle);

      const noDataDiv = document.createElement("div");
      noDataDiv.style.padding = "1rem";
      noDataDiv.style.textAlign = "center";
      noDataDiv.innerHTML = "<p>No fusion welding items found.</p>";

      const btnAdd = document.createElement("button");
      btnAdd.type = "button";
      btnAdd.className = "btn-primary";
      btnAdd.textContent = "+ Add FUSION Row";
      btnAdd.style.marginTop = "0.5rem";
      btnAdd.onclick = () => openAddDialog("FUSION");
      noDataDiv.appendChild(btnAdd);

      trace.appendChild(noDataDiv);
    }

    // --- Render SPOT WELDING table ---
    if (SWLD.length > 0) {
      const swldTable = document.createElement("table");
      swldTable.style.width = "100%";
      swldTable.border = "1";

      const swldTitle = document.createElement("h3");
      swldTitle.textContent = "SPOT WELDING";
      trace.appendChild(swldTitle);

      const swldThead = document.createElement("thead");
      const swldHeaderRow = document.createElement("tr");
      ["Item", "Part Number", "Specification", "Trace ID", "Actions"].forEach(
        (txt) => {
          const th = document.createElement("th");
          th.textContent = txt;
          if (txt === "Actions") th.style.textAlign = "center";
          swldHeaderRow.appendChild(th);
        }
      );
      swldThead.appendChild(swldHeaderRow);
      swldTable.appendChild(swldThead);

      const swldTbody = document.createElement("tbody");
      for (const item of SWLD) {
        const row = document.createElement("tr");

        const tdJob = document.createElement("td");
        tdJob.textContent =
          (item.JOB ? item.JOB.trim() : "") +
          (item.SUFFIX ? `-${item.SUFFIX.trim()}` : "");
        row.appendChild(tdJob);

        const tdPart2 = document.createElement("td");
        tdPart2.textContent = item.PART ? item.PART.trim() : "";
        row.appendChild(tdPart2);

        // Specification column
        const tdSpec = document.createElement("td");
        let spec = "";
        if (
          item.TEXT &&
          typeof item.TEXT === "string" &&
          item.TEXT.includes("8604")
        ) {
          spec = "MIL-W-8604";
        }
        tdSpec.textContent = spec;
        row.appendChild(tdSpec);

        const tdSerial = document.createElement("td");
        let serial = item.SERIAL_NUMBER ? item.SERIAL_NUMBER.trim() : "";
        if (!serial) {
          try {
            const job = item.JOB ? item.JOB.trim() : "";
            const suffix = item.SUFFIX ? item.SUFFIX.trim() : "";
            const lineRouter = item.LINE_ROUTER ? item.LINE_ROUTER.trim() : "";
            let jobString = job;
            if (suffix) jobString += `-${suffix}`;
            if (lineRouter) jobString += `-${lineRouter}`;
            const poResponse = await fetch(
              `http://${
                window.location.hostname
              }:${port}/cert/swld/${encodeURIComponent(jobString)}`
            );
            if (poResponse.ok) {
              const poData = await poResponse.json();
              if (poData && poData[0].PURCHASE_ORDER) {
                serial = poData[0].PURCHASE_ORDER.trim();
              } else if (poData && poData[0].DATE_COMPLETED) {
                serial = poData[0].DATE_COMPLETED.trim();
              }
            }
          } catch (err) {
            // ignore error, leave serial empty
          }
        }
        // Remove leading zeros from serial
        if (serial) {
          while (serial.charAt(0) === "0") {
            serial = serial.substring(1);
          }
        }
        tdSerial.textContent = serial;
        row.appendChild(tdSerial);

        // Add Actions column
        const actionCell = createActionCell(
          "SPOT",
          item.SERIAL_NUMBER?.trim(),
          {
            job: item.JOB?.trim(),
            part: item.PART?.trim(),
            operation: item.OPERATION?.trim(),
            serialNumber: item.SERIAL_NUMBER?.trim(),
          }
        );
        row.appendChild(actionCell);

        swldTbody.appendChild(row);
      }
      swldTable.appendChild(swldTbody);
      trace.appendChild(swldTable);
    } else {
      const swldTitle = document.createElement("h3");
      swldTitle.textContent = "SPOT WELDING";
      trace.appendChild(swldTitle);

      const noDataDiv = document.createElement("div");
      noDataDiv.style.padding = "1rem";
      noDataDiv.style.textAlign = "center";
      noDataDiv.innerHTML = "<p>No spot welding items found.</p>";

      const btnAdd = document.createElement("button");
      btnAdd.type = "button";
      btnAdd.className = "btn-primary";
      btnAdd.textContent = "+ Add SPOT Row";
      btnAdd.style.marginTop = "0.5rem";
      btnAdd.onclick = () => openAddDialog("SPOT");
      noDataDiv.appendChild(btnAdd);

      trace.appendChild(noDataDiv);
    }

    // --- Render HEAT TREATING table ---
    if (HEAT.length > 0) {
      // Remove duplicates from HEAT based on JOB, SUFFIX, PART, SERIAL_NUMBER
      const seen = new Set();
      const uniqueHEAT = [];
      for (const item of HEAT) {
        const key = [
          item.JOB ? item.JOB.trim() : "",
          item.SUFFIX ? item.SUFFIX.trim() : "",
          item.PART ? item.PART.trim() : "",
          item.SERIAL_NUMBER ? item.SERIAL_NUMBER.trim() : "",
        ].join("|");
        if (!seen.has(key)) {
          seen.add(key);
          uniqueHEAT.push(item);
        }
      }
      const heatTable = document.createElement("table");
      heatTable.style.width = "100%";
      heatTable.border = "1";

      const heatTitle = document.createElement("h3");
      heatTitle.textContent = "HEAT TREATING";
      trace.appendChild(heatTitle);

      const heatThead = document.createElement("thead");
      const heatHeaderRow = document.createElement("tr");
      ["Item", "Part Number", "Specification", "Trace ID", "Actions"].forEach(
        (txt) => {
          const th = document.createElement("th");
          th.textContent = txt;
          if (txt === "Actions") th.style.textAlign = "center";
          heatHeaderRow.appendChild(th);
        }
      );
      heatThead.appendChild(heatHeaderRow);
      heatTable.appendChild(heatThead);

      const heatTbody = document.createElement("tbody");
      for (const item of uniqueHEAT) {
        const row = document.createElement("tr");

        const tdJob = document.createElement("td");
        tdJob.textContent =
          (item.JOB ? item.JOB.trim() : "") +
          (item.SUFFIX ? `-${item.SUFFIX.trim()}` : "");
        row.appendChild(tdJob);

        const tdPart2 = document.createElement("td");
        tdPart2.textContent = item.PART ? item.PART.trim() : "";
        row.appendChild(tdPart2);

        // Specification column
        const tdSpec = document.createElement("td");
        let spec = "";
        if (item.OPERATION) {
          switch (item.OPERATION) {
            case "HT24A":
              spec = "MIL-DTL-5541 Type I Class 1A";
              break;
            case "HT 24B":
              spec = "HEAT TREAT 2024 NON CLAD .064";
              break;
            case "HT24C":
              spec = "HEAT TREAT 2024 NON CLAD .080";
              break;
            case "HT24D":
              spec = "HEAT TREAT 2024 NON CLAD .091";
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
        tdSpec.textContent = spec;
        row.appendChild(tdSpec);

        const tdSerial = document.createElement("td");
        let serial = item.SERIAL_NUMBER ? item.SERIAL_NUMBER.trim() : "";
        if (!serial) {
          try {
            const job = item.JOB ? item.JOB.trim() : "";
            const suffix = item.SUFFIX ? item.SUFFIX.trim() : "";
            const lineRouter = item.LINE_ROUTER ? item.LINE_ROUTER.trim() : "";
            let jobString = job;
            if (suffix) jobString += `-${suffix}`;
            if (lineRouter) jobString += `-${lineRouter}`;
            const poResponse = await fetch(
              `http://${
                window.location.hostname
              }:${port}/cert/heat/${encodeURIComponent(jobString)}`
            );
            if (poResponse.ok) {
              const poData = await poResponse.json();
              // console.log("PO Data for HEAT:", poData);
              if (poData && poData[0]) {
                if (poData[0][0].PURCHASE_ORDER) {
                  serial = poData[0][0].PURCHASE_ORDER.trim();
                } else if (poData[0][0].DATE_COMPLETED) {
                  serial = poData[0][0].DATE_COMPLETED.trim();
                }
              }
            }
          } catch (err) {
            console.error("Error fetching HEAT data for", item.JOB, err);
            // ignore error, leave serial empty
          }
        }
        // Remove leading zeros from serial
        if (serial) {
          while (serial.charAt(0) === "0") {
            serial = serial.substring(1);
          }
        }
        tdSerial.textContent = serial;
        row.appendChild(tdSerial);

        // Add Actions column
        const actionCell = createActionCell(
          "HEAT",
          item.SERIAL_NUMBER?.trim(),
          {
            job: item.JOB?.trim(),
            part: item.PART?.trim(),
            operation: item.OPERATION?.trim(),
            serialNumber: item.SERIAL_NUMBER?.trim(),
          }
        );
        row.appendChild(actionCell);

        heatTbody.appendChild(row);
      }
      heatTable.appendChild(heatTbody);
      trace.appendChild(heatTable);
    } else {
      const heatTitle = document.createElement("h3");
      heatTitle.textContent = "HEAT TREATING";
      trace.appendChild(heatTitle);

      const noDataDiv = document.createElement("div");
      noDataDiv.style.padding = "1rem";
      noDataDiv.style.textAlign = "center";
      noDataDiv.innerHTML = "<p>No heat treating items found.</p>";

      const btnAdd = document.createElement("button");
      btnAdd.type = "button";
      btnAdd.className = "btn-primary";
      btnAdd.textContent = "+ Add HEAT Row";
      btnAdd.style.marginTop = "0.5rem";
      btnAdd.onclick = () => openAddDialog("HEAT");
      noDataDiv.appendChild(btnAdd);

      trace.appendChild(noDataDiv);
    }
  } catch (error) {
    console.error("Error fetching CERT data:", error);
  } finally {
    // Hide loading indicator
    const loadingIndicator = document.getElementById("loadingIndicator");
    loadingIndicator.style.display = "none";
  }
});

// ==================================================
window.addEventListener("DOMContentLoaded", () => {
  const trace = document.getElementById("cert-trace");
  const traceIdDiv = document.createElement("div");
  traceIdDiv.id = "trace-id-list";
  trace.appendChild(traceIdDiv);

  function updateTraceIdList() {
    // Find all table cells in #trace that are Trace ID columns
    const traceIds = [];
    trace.querySelectorAll("table tbody tr").forEach((row) => {
      // The Trace ID is always the last cell in each row
      const cells = row.querySelectorAll("td");
      if (cells.length > 0) {
        const traceId = cells[cells.length - 1].textContent.trim();
        if (traceId) traceIds.push(traceId);
      }
    });
    if (traceIds.length > 0) {
      traceIdDiv.textContent = "All Trace IDs: " + traceIds.join(" ");
      console.log("Collected Trace IDs:", traceIds);
    } else {
      traceIdDiv.textContent = "";
    }
  }

  // Observe changes to #trace to update the list when tables are rendered
  const observer = new MutationObserver(updateTraceIdList);
  observer.observe(trace, { childList: true, subtree: true });

  // Initial update in case content is already present
  updateTraceIdList();

  const stmt = document.getElementById("stmt");
  // Add a certification statement section at the end of main
  const certStatement = document.createElement("div");
  certStatement.id = "cert-statement";
  certStatement.innerHTML = `
    <h2 id="csHeader">Certification Statement</h2>
    <p>This is to certify that the above listed items have been processed according to the specified requirements and standards.</p>
  `;
  stmt.appendChild(certStatement);

  // Add a certificator's signature section at the end of main
  const signatureSection = document.createElement("div");
  signatureSection.id = "cert-signature";
  signatureSection.innerHTML = `
    <h3>Certified by:</h3>
    <p>__________________________</p>
    <p>Name: ______________________</p>
    <p>Date: _______________________</p>
  `;
  stmt.appendChild(signatureSection);
});
