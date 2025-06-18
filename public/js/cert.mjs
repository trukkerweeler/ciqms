import { myport } from "./utils.mjs";

const port = myport() || 3003;
btnSearch.addEventListener("click", async function (event) {
  event.preventDefault();

  let woNumber = woNo.value.trim();
  if (!woNumber) {
    console.error("Work Order No is empty");
    return;
  }

  const url = `http://localhost:${port}/cert/${woNumber}`;
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
    trace.innerHTML = "";
    let RM = [];
    const enteredWo = document.createElement("h2");
    enteredWo.textContent = `Work Order No: ${woNumber}`;
    trace.appendChild(enteredWo);

    // Only push RM items from the main data here
    data.forEach((item) => {
      let prodLine = item["PRODUCT_LINE"].trim();
      if (prodLine === "RM") {
        RM.push({
          job:
            (item["JOB"] ? item["JOB"].trim() : "") +
            (item["SUFFIX"] ? `-${item["SUFFIX"].trim()}` : ""),
          part: item["PART"] ? item["PART"].trim() : "",
          part2: item["PART2"] ? item["PART2"].trim() : "",
          serialNumber: item["SERIAL_NUMBER"]
            ? item["SERIAL_NUMBER"].trim()
            : "",
        });
      }
    });

    // Wait for all detail fetches to complete before displaying RM items
    await Promise.all(
      data.map((item) => {
        let serialNumber = item["SERIAL_NUMBER"]
          ? item["SERIAL_NUMBER"].trim()
          : "";
        if (/^\d{6}-\d{3}$/.test(serialNumber)) {
            return fetch(`http://localhost:${port}/cert/detail/${serialNumber}`)
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
                  ? detail.SERIAL_NUMBER.trim().replace(/^PO: 00/, "")
                  : "";
                // Check if the RM item already exists
                const exists = RM.some(
                  (rmItem) =>
                  rmItem.job ===
                    (detail.JOB ? detail.JOB.trim() : "") +
                    (detail.SUFFIX ? `-${detail.SUFFIX.trim()}` : "") &&
                  rmItem.part ===
                    (detail.PART ? detail.PART.trim() : "") &&
                  rmItem.part2 ===
                    (detail.PART2 ? detail.PART2.trim() : "") &&
                  rmItem.serialNumber === ddSerialNumber
                );
                if (!exists) {
                  RM.push({
                  job:
                    (detail.JOB ? detail.JOB.trim() : "") +
                    (detail.SUFFIX ? `-${detail.SUFFIX.trim()}` : ""),
                  part: detail.PART ? detail.PART.trim() : "",
                  part2: detail.PART2 ? detail.PART2.trim() : "",
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

        const tdSerial = document.createElement("td");
        tdSerial.textContent = item.serialNumber;
        row.appendChild(tdSerial);

        tbody.appendChild(row);
      });
      table.appendChild(tbody);

      trace.appendChild(table);
    } else {
      trace.textContent = "No RM items found.";
    }

    // right hee ahh
    // console.log("144 data items:", data);
    let CHEM = [];
    let FWLD = [];
    let SWLD = [];
    let HEAT = [];

    const serialNumbers = data
      .map((item) => item["SERIAL_NUMBER"] && item["SERIAL_NUMBER"].trim())
      .filter((sn) => /^\d{6}-\d{3}$/.test(sn));

    for (const serialNumber of serialNumbers) {
      try {
        const procResponse = await fetch(
          `http://localhost:3003/cert/processes/${encodeURIComponent(
            serialNumber
          )}`,
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
        // console.log(`Processes for ${serialNumber}:`, procData);
        if (procData && procData.length > 0) {
          procData.forEach((proc) => {
            const op =
              proc.OPERATION && typeof proc.OPERATION.trim === "function"
                ? proc.OPERATION.trim()
                : proc.OPERATION || "";
            if (op === "FT1C3A" || op === "FT1C1A" || op === "FT1C3" || op === "FT2C3" || op === "FT2C1A") {
              CHEM.push(proc);
            } else if (op === "FUSION") {
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
        console.log(
          "========================================================="
        );
      }
    }

    // Display CHEM items =======================================================
    if (CHEM.length > 0) {
      const chemTable = document.createElement("table");
      chemTable.style.width = "100%";
      chemTable.border = "1";

      // Create and append table title
      const chemTitle = document.createElement("h3");
      chemTitle.textContent = "CHEMICAL TREATMENT";
      trace.appendChild(chemTitle);

      const chemThead = document.createElement("thead");
      const chemHeaderRow = document.createElement("tr");

      const chemThJob = document.createElement("th");
      chemThJob.textContent = "Item";
      chemHeaderRow.appendChild(chemThJob);

      const chemThPart2 = document.createElement("th");
      chemThPart2.textContent = "Part Number";
      chemHeaderRow.appendChild(chemThPart2);

      // Specification column
      const chemThSpec = document.createElement("th");
      chemThSpec.textContent = "Specification";
      chemHeaderRow.appendChild(chemThSpec);

      const chemThSerial = document.createElement("th");
      chemThSerial.textContent = "Trace ID";
      chemHeaderRow.appendChild(chemThSerial);

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
        if(item.OPERATION) {
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
            // Build the job string with dashes between JOB, SUFFIX, and LINE_ROUTER (if present)
            let jobString = job;
            if (suffix) jobString += `-${suffix}`;
            if (lineRouter) jobString += `-${lineRouter}`;
            const poResponse = await fetch(
              `http://localhost:3003/cert/certpurchase/${encodeURIComponent(
                jobString
              )}`
            );
            if (poResponse.ok) {
              const poData = await poResponse.json();
              // console.log(`PO Data for ${jobString}:`, poData);
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
        }
        if (tdSerial.textContent !== "") {
          while (tdSerial.textContent.charAt(0) === "0") {
            tdSerial.textContent = tdSerial.textContent.substring(1);
          }
        }
        row.appendChild(tdSerial);

        chemTbody.appendChild(row);
      }
      chemTable.appendChild(chemTbody);
      trace.appendChild(chemTable); // append to chem
    }
    // Display FWLD items======================================================
    if (FWLD.length > 0) {
      const fwldTable = document.createElement("table");
      fwldTable.style.width = "100%";
      fwldTable.border = "1";

      // Create and append table title
      const fwldTitle = document.createElement("h3");
      fwldTitle.textContent = "FUSION WELDING";
      trace.appendChild(fwldTitle);

      const fwldThead = document.createElement("thead");
      const fwldHeaderRow = document.createElement("tr");

      const fwldThJob = document.createElement("th");
      fwldThJob.textContent = "Item";
      fwldHeaderRow.appendChild(fwldThJob);

      const fwldThPart2 = document.createElement("th");
      fwldThPart2.textContent = "Part Number";
      fwldHeaderRow.appendChild(fwldThPart2);

      const fwldThSpec = document.createElement("th");
      fwldThSpec.textContent = "Specification";
      fwldHeaderRow.appendChild(fwldThSpec);

      const fwldThSerial = document.createElement("th");
      fwldThSerial.textContent = "Trace ID";
      fwldHeaderRow.appendChild(fwldThSerial);

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
              `http://localhost:3003/cert/fwld/${encodeURIComponent(jobString)}`
            );
            if (poResponse.ok) {
              const poData = await poResponse.json();
              if (poData && poData[0].PURCHASE_ORDER) {
                serial = poData[0].PURCHASE_ORDER.trim();
              } else if (poData && poData[0].DATE_COMPLETED) {
                // If no purchase order, use date completed as serial
                serial = poData[0].DATE_COMPLETED.trim();
              }
            }
          } catch (err) {
            // ignore error, leave serial empty
          }
        }
        tdSerial.textContent = serial;
        row.appendChild(tdSerial);

        fwldTbody.appendChild(row);
      }
      fwldTable.appendChild(fwldTbody);
      trace.appendChild(fwldTable);
    }

    // Display SWLD items======================================================
    if (SWLD.length > 0) {
      const swldTable = document.createElement("table");
      swldTable.style.width = "100%";
      swldTable.border = "1";

      // Create and append table title
      const swldTitle = document.createElement("h3");
      swldTitle.textContent = "SPOT WELDING";
      trace.appendChild(swldTitle);

      const swldThead = document.createElement("thead");
      const swldHeaderRow = document.createElement("tr");

      const swldThJob = document.createElement("th");
      swldThJob.textContent = "Item";
      swldHeaderRow.appendChild(swldThJob);

      const swldThPart2 = document.createElement("th");
      swldThPart2.textContent = "Part Number";
      swldHeaderRow.appendChild(swldThPart2);

      const swldThSpec = document.createElement("th");
      swldThSpec.textContent = "Specification";
      swldHeaderRow.appendChild(swldThSpec);

      const swldThSerial = document.createElement("th");
      swldThSerial.textContent = "Trace ID";
      swldHeaderRow.appendChild(swldThSerial);

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
              `http://localhost:3003/cert/swld/${encodeURIComponent(jobString)}`
            );
            if (poResponse.ok) {
              const poData = await poResponse.json();
              if (poData && poData[0].PURCHASE_ORDER) {
                serial = poData[0].PURCHASE_ORDER.trim();
              } else if (poData && poData[0].DATE_COMPLETED) {
                // If no purchase order, use date completed as serial
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

        swldTbody.appendChild(row);
      }
      swldTable.appendChild(swldTbody);
      trace.appendChild(swldTable);
    }

    // Display HEAT items=======================================================
    if (HEAT.length > 0) {
      // Remove duplicates from HEAT based on JOB, SUFFIX, PART, SERIAL_NUMBER
      const seen = new Set();
      const uniqueHEAT = [];
      for (const item of HEAT) {
        const key = [
          item.JOB ? item.JOB.trim() : "",
          item.SUFFIX ? item.SUFFIX.trim() : "",
          item.PART ? item.PART.trim() : "",
          item.SERIAL_NUMBER ? item.SERIAL_NUMBER.trim() : ""
        ].join("|");
        if (!seen.has(key)) {
          seen.add(key);
          uniqueHEAT.push(item);
        }
      }
      // for (const item of uniqueHEAT) {
      //   console.log("Unique HEAT item:", item);
      // }
      const heatTable = document.createElement("table");
      heatTable.style.width = "100%";
      heatTable.border = "1";

      // Create and append table title
      const heatTitle = document.createElement("h3");
      heatTitle.textContent = "HEAT TREATING";
      trace.appendChild(heatTitle);

      const heatThead = document.createElement("thead");
      const heatHeaderRow = document.createElement("tr");

      const heatThJob = document.createElement("th");
      heatThJob.textContent = "Item";
      heatHeaderRow.appendChild(heatThJob);

      const heatThPart2 = document.createElement("th");
      heatThPart2.textContent = "Part Number";
      heatHeaderRow.appendChild(heatThPart2);

      const heatThSpec = document.createElement("th");
      heatThSpec.textContent = "Specification";
      heatHeaderRow.appendChild(heatThSpec);

      const swldThSerial = document.createElement("th");
      swldThSerial.textContent = "Trace ID";
      heatHeaderRow.appendChild(swldThSerial);

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
        if (
          item.TEXT &&
          typeof item.TEXT === "string" &&
          item.TEXT.includes("6088")
        ) {
          spec = "AMS-H-6088";
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
              `http://localhost:3003/cert/heat/${encodeURIComponent(jobString)}`
            );
            if (poResponse.ok) {
              const poData = await poResponse.json();
              // console.log(`PO Data for ${jobString}:`, poData);
              if (poData && poData[0].PURCHASE_ORDER) {
                serial = poData[0].PURCHASE_ORDER.trim();
              } else if (poData && poData[0].DATE_COMPLETED) {
                // If no purchase order, use date completed as serial
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

        heatTbody.appendChild(row);
      }
      heatTable.appendChild(heatTbody);
      trace.appendChild(heatTable);
    }




  } catch (error) {
    console.error("Error fetching CERT data:", error);
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
