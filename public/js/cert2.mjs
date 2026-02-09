import { renderTableFromArray, getApiUrl} from "./utils.mjs";
let apiUrl = "";

document.addEventListener("DOMContentLoaded", async () => {
  apiUrl = await getApiUrl();
});

if (btnSearch) {
  btnSearch.addEventListener("click", async function (event) {
  event.preventDefault();

  let woNumber = woNo.value.trim();
  if (!woNumber) {
    console.error("Work Order No is empty");
    return;
  }

  const url = `${apiUrl}/cert/${woNumber}`;
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

    let data;
    try {
      data = await response.json();
      // console.log("Fetched data:", data);
    } catch (jsonErr) {
      const rawText = await response.text();
      console.error("Failed to parse JSON. Raw response:", rawText);
      throw jsonErr;
    }


    // --- Collect RM items ---
    let RM = [];
    const rmSet = new Set();
    data.forEach((item) => {
      let prodLine = item["PRODUCT_LINE"].trim();
      if (prodLine === "RM") {
        const JOB = item["JOB"] ? item["JOB"].trim() : "";
        const SUFFIX = item["SUFFIX"] ? item["SUFFIX"].trim() : "";
        const part = item["PART"] ? item["PART"].trim() : "";
        const part2 = item["PART2"] ? item["PART2"].trim() : "";
        let PURCHASE_ORDER = item["SERIAL_NUMBER"]
          ? item["SERIAL_NUMBER"].trim()
          : "";
        if (PURCHASE_ORDER.startsWith("PO: 00")) {
          PURCHASE_ORDER = PURCHASE_ORDER.replace(/^PO: 00/, "");
        }
        const key = [JOB, SUFFIX, part, part2, PURCHASE_ORDER].join("|");
        if (!rmSet.has(key)) {
          rmSet.add(key);
          RM.push({ JOB, SUFFIX, part, part2, PURCHASE_ORDER: PURCHASE_ORDER });
        }
      }
    });

    // Fetch RM details
    await Promise.all(
      data.map((item) => {
        let serialNumber = item["SERIAL_NUMBER"]
          ? item["SERIAL_NUMBER"].trim()
          : "";
        if (/^\d{6}-\d{3}$/.test(serialNumber)) {
            return fetch(`${apiUrl}/cert/detail/${serialNumber}`)
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
                if (ddSerialNumber.startsWith("PO: 00")) {
                  ddSerialNumber = ddSerialNumber.replace(/^PO: 00/, "");
                }
                const JOB = detail.JOB ? detail.JOB.trim() : "";
                const SUFFIX = detail.SUFFIX ? detail.SUFFIX.trim() : "";
                const part = detail.PART ? detail.PART.trim() : "";
                const part2 = detail.PART2 ? detail.PART2.trim() : "";
                const key = [JOB, SUFFIX, part, part2, ddSerialNumber].join(
                  "|"
                );
                if (!rmSet.has(key)) {
                  rmSet.add(key);
                  RM.push({
                  JOB,
                  SUFFIX,
                  part,
                  part2,
                  PURCHASE_ORDER: ddSerialNumber,
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

    // --- Collect CHEM, FWLD, SWLD, HEAT, PASS arrays ---
    let CHEM = [];
    let FWLD = [];
    let SWLD = [];
    let HEAT = [];
    let PASS = [];

    // Collect PASS items from main data (PRODUCT_LINE === "PASS")
    data.forEach((item) => {
      let prodLine = item["PRODUCT_LINE"] ? item["PRODUCT_LINE"].trim() : "";
      if (prodLine === "PASS") {
        let serialNumber = item["SERIAL_NUMBER"]
          ? item["SERIAL_NUMBER"].trim()
          : "";
        if (serialNumber.startsWith("PO: 00")) {
          serialNumber = serialNumber.replace(/^PO: 00/, "");
        }
        PASS.push({
          JOB: item["JOB"] ? item["JOB"].trim() : "",
          SUFFIX: item["SUFFIX"] ? item["SUFFIX"].trim() : "",
          PART: item["PART"] ? item["PART"].trim() : "",
          PART2: item["PART2"] ? item["PART2"].trim() : "",
          SERIAL_NUMBER: serialNumber,
          PURCHASE_ORDER: item["PURCHASE_ORDER"]
            ? item["PURCHASE_ORDER"].trim()
            : "",
          TEXT: item["TEXT"] ? item["TEXT"].trim() : "",
          LINE_ROUTER: item["LINE_ROUTER"] ? item["LINE_ROUTER"].trim() : "",
        });
      }
    });

    // Collect serial numbers from SERIAL_NUMBER if valid, or construct from JOB-SUFFIX if possible
    const serialNumbers = data
      .map((item) => {
        let sn = item["SERIAL_NUMBER"] && item["SERIAL_NUMBER"].trim();
        const job = item["JOB"] ? item["JOB"].trim() : "";
        const suffix = item["SUFFIX"] ? item["SUFFIX"].trim() : "";
        let serials = [];
        if (sn && /^\d{6}-\d{3}$/.test(sn)) {
          serials.push(sn);
        }
        if (/^\d{6}$/.test(job) && /^\d{3}$/.test(suffix)) {
          serials.push(`${job}-${suffix}`);
        }
        return serials;
      })
      .flat()
      .filter((sn) => !!sn && /^\d{6}-\d{3}$/.test(sn));

    // Collect process data for each serial number
    for (const serialNumber of serialNumbers) {
      try {
        const procResponse = await fetch(
          `${apiUrl}/cert/processes/${encodeURIComponent(
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
            } else if (op === "FUSION") {
              FWLD.push(proc);
            } else if (op === "SPOTW") {
              SWLD.push(proc);
            } else if (
              op.includes("HT") ||
              op.includes("6013") ||
              op.includes("6061") ||
              op.includes("7075") ||
              op.includes("7075B") ||
              op.includes("7075C") ||
              op.includes("HT2") ||
              op.includes("HT3") ||
              op.includes("HT6") ||
              op.includes("HT7")
            ) {
              HEAT.push(proc);
            } else if (op === "PASST6" || op === "PASS") {
              PASS.push(proc);
            }
          });
        }
      } catch (err) {
        console.error("Error fetching processes for", serialNumber, err);
      }
    }

    // Remove duplicates from CHEM, FWLD, SWLD, HEAT, PASS based on JOB, SUFFIX, PART, SERIAL_NUMBER
    function dedupe(arr, keyFields) {
      const seen = new Set();
      const result = [];
      for (const item of arr) {
        const key = keyFields
          .map((f) => (item[f] ? item[f].trim() : ""))
          .join("|");
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }
      return result;
    }
    HEAT = dedupe(HEAT, ["JOB", "SUFFIX", "PART", "SERIAL_NUMBER"]);
    FWLD = dedupe(FWLD, ["JOB", "SUFFIX", "PART", "SERIAL_NUMBER"]);
    SWLD = dedupe(SWLD, ["JOB", "SUFFIX", "PART", "SERIAL_NUMBER"]);
    CHEM = dedupe(CHEM, ["JOB", "SUFFIX", "PART", "SERIAL_NUMBER"]);
    PASS = dedupe(PASS, ["JOB", "SUFFIX", "PART", "PURCHASE_ORDER"]);

    // Helper function to fetch and assign PURCHASE_ORDER for an array
    async function assignPurchaseOrder(
      arr,
      jobField = "JOB",
      suffixField = "SUFFIX",
      seqField = "RTR_SEQ"
    ) {
      for (const item of arr) {
        const job = item[jobField] ? item[jobField].trim() : "";
        const suffix = item[suffixField] ? item[suffixField].trim() : "";
        const rtr_seq = item[seqField] ? item[seqField].trim() : "";
        const receiverUrl = `${apiUrl}/receiver?job=${encodeURIComponent(
          job
        )}&suffix=${encodeURIComponent(suffix)}&rtr_seq=${encodeURIComponent(
          rtr_seq
        )}`;
        // console.log("Receiver URL:", receiverUrl);
        try {
          const receiverResponse = await fetch(receiverUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
          const receiverData = await receiverResponse.json();
          if (receiverResponse.ok && receiverData && receiverData.length > 0) {
            item.PURCHASE_ORDER = receiverData[0].NEXT_PURCHASE_ORDER || "";
            item.DATE_COMPLETED = receiverData[0].DATE_COMPLETED || "";
          } else {
            item.PURCHASE_ORDER = item.NEXT_PURCHASE_ORDER || "";
            item.DATE_COMPLETED = item.DATE_COMPLETED || "";
          }
        } catch (err) {
          item.PURCHASE_ORDER = item.NEXT_PURCHASE_ORDER || "";
          item.DATE_COMPLETED = item.DATE_COMPLETED || "";
        }
      }
    }

    // Assign PURCHASE_ORDER for each array except RM
    await assignPurchaseOrder(CHEM);
    await assignPurchaseOrder(FWLD);
    await assignPurchaseOrder(SWLD);
    await assignPurchaseOrder(HEAT);
    await assignPurchaseOrder(PASS);

    // Return the data as needed, e.g., for rendering in the UI
    console.log("RM Data:", RM);
    console.log("CHEM Data:", CHEM);
    console.log("FWLD Data:", FWLD);
    console.log("SWLD Data:", SWLD);
    console.log("HEAT Data:", HEAT);
    console.log("PASS Data:", PASS);

    // Append certsection HTML to the #main element
    // const main = document.getElementById("main");
    // Clear previous content in each section
    const traceDiv = document.getElementById("trace");
    const heatDiv = document.getElementById("heat");
    const spotDiv = document.getElementById("spot");
    const fusionDiv = document.getElementById("fusion");
    const chemDiv = document.getElementById("chem");
    const passDiv = document.getElementById("pass");

    // Display WO on the page
    if (traceDiv) {
      const enteredWo = document.createElement("h2");
      enteredWo.textContent = `Work Order No: ${woNumber}`;
      enteredWo.className = "mt-0 mb-0";
      traceDiv.appendChild(enteredWo);
    }
    if (typeof RM !== "undefined" && traceDiv)
      traceDiv.innerHTML += renderTableFromArray(RM, "Raw Materials");
    if (typeof HEAT !== "undefined" && heatDiv)
      heatDiv.innerHTML = renderTableFromArray(HEAT, "Heat Treatment");
    if (typeof FWLD !== "undefined" && fusionDiv)
      fusionDiv.innerHTML = renderTableFromArray(FWLD, "Fusion Welding");
    if (typeof SWLD !== "undefined" && spotDiv)
      spotDiv.innerHTML = renderTableFromArray(SWLD, "Spot Welding");
    if (typeof CHEM !== "undefined" && chemDiv)
      chemDiv.innerHTML = renderTableFromArray(CHEM, "Chemical Processing");
    if (typeof PASS !== "undefined" && passDiv)
      passDiv.innerHTML = renderTableFromArray(PASS, "Passivation");
  } catch (error) {
    console.error("Error fetching CERT data:", error);
  }

  const stmt = document.getElementById("stmt");
  // Add a certification statement section at the end of main
  const certStatement = document.createElement("div");
  certStatement.id = "cert-statement";
  certStatement.innerHTML = `
    <h2 id="csHeader" class="mt-0">Certification Statement</h2>
    <p class="mt-0 mb-0">This is to certify that the above listed items have been processed according to the specified requirements and standards.</p>
  `;
  stmt.appendChild(certStatement);

  // Add a certificator's signature section at the end of main
  const signatureSection = document.createElement("div");
  signatureSection.id = "cert-signature";
  signatureSection.innerHTML = `
    <h3 class="mt-0">Certified by:</h3>
    <div class="signature-box">
    <p>__________________________</p>
    <p>Name: ______________________</p>
    <p>Date: _______________________</p>
  </div>
  `;
  stmt.appendChild(signatureSection);
});
