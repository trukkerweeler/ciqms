// processcert-diagnostic.mjs - Diagnostic tool for Process Certificate operations

// Special process codes for highlighting
const SPECIAL_PROCESS_CODES = [
  "SPOTW", // Spot Welding
  "6061", // Passivation spec
  "ALODINE", // Alodine passivation
  "WELD", // Welding processes
  "NADCAP", // NADCAP certified processes
  "CHEM FILM", // Chemical film
  "PASSIV", // Passivation (catches PASSIVATE, PASSIVATION, etc.)
];

const TRULY_NON_CERT_OPS = [
  "MISCELLANEOUS OUTSIDE",
  "MISC OUTSIDE",
  "MISCELLANEOUS",
  "PARTS TRANSFERRED FROM WIP",
  "PARTS TRANSFERED FROM WIP",
];

/**
 * Check if an operation is a special process
 */
function isSpecialProcess(processName) {
  if (!processName) return false;
  const upperName = processName.trim().toUpperCase();
  return SPECIAL_PROCESS_CODES.some((code) =>
    upperName.includes(code.toUpperCase()),
  );
}

let currentData = null;
let currentJobNumber = null;
let currentPackingSlip = null;

export async function fetchByPackingSlip() {
  const pckNo = document
    .getElementById("packingSlipNumber")
    .value.trim()
    .padStart(6, "0");
  if (!pckNo) {
    showStatus("Please enter a packing slip number", "error");
    return;
  }

  currentPackingSlip = pckNo;
  currentJobNumber = null;
  showStatus("Looking up packing slip...", "loading");

  // Hide previous results
  document.getElementById("jobInfo").innerHTML = "";
  document.getElementById("allRawOps").innerHTML = "";
  document.getElementById("allFilterAnalysis").innerHTML = "";
  document.getElementById("allGrouping").innerHTML = "";
  document.getElementById("finalSections").innerHTML = "";
  document.getElementById("rawJSON").textContent = "";

  try {
    // Step 1: lookup jobs from packing slip
    const psResponse = await fetch(
      `/processcert/jobs-by-packing-slip?pck_no=${encodeURIComponent(pckNo)}`,
    );
    const psData = await psResponse.json();

    if (!psResponse.ok || !psData.success) {
      showStatus(
        `Packing slip lookup failed: ${psData.error || psResponse.statusText}`,
        "error",
      );
      return;
    }

    // Show lookup results
    const lookupSection = document.getElementById("packingSlipLookup");
    const lookupInfo = document.getElementById("packingSlipInfo");
    lookupSection.style.display = "block";

    const jobs = psData.jobs || [];
    let lookupHtml = `
      <div style="padding:10px; background:#f0f8ff; border-left:3px solid #2e7d32; border-radius:4px; margin-bottom:10px;">
        <strong>Packing Slip:</strong> ${pckNo} &nbsp;|&nbsp;
        <strong>Jobs found:</strong> ${jobs.length}
      </div>
      <table>
        <thead><tr><th>#</th><th>SERIAL (raw)</th><th>Job</th><th>Suffix</th></tr></thead>
        <tbody>
    `;
    jobs.forEach((j, i) => {
      lookupHtml += `<tr><td>${i + 1}</td><td>${j.job}-${j.suffix}</td><td>${j.job}</td><td>${j.suffix}</td></tr>`;
    });
    lookupHtml += `</tbody></table>`;
    lookupInfo.innerHTML = lookupHtml;

    // Step 2: fan-out — fetch cert data for all jobs in parallel
    showStatus(
      `Found ${jobs.length} job(s), fetching certificate data...`,
      "loading",
    );

    const jobResults = await Promise.all(
      jobs.map(async (job) => {
        try {
          const r = await fetch(
            `/processcert/build-cert?job=${job.job}&suffix=${job.suffix}`,
          );
          const d = await r.json();
          if (!r.ok || !d.certificateData) return null;
          // Tag each entry with the packing slip source job
          d.certificateData.forEach((entry) => {
            entry._psSourceJob = `${job.job}-${job.suffix}`;
          });
          return d.certificateData;
        } catch (e) {
          console.warn(`Error fetching ${job.job}-${job.suffix}:`, e);
          return null;
        }
      }),
    );

    const allCertData = jobResults.flat().filter(Boolean);

    if (allCertData.length === 0) {
      showStatus("No certificate data returned for any job", "error");
      return;
    }

    currentData = {
      success: true,
      packingSlip: pckNo,
      jobs,
      certificateData: allCertData,
    };

    document.getElementById("rawJSON").textContent = JSON.stringify(
      currentData,
      null,
      2,
    );
    analyzeData();
    showStatus(
      `✓ Loaded ${allCertData.length} parent transaction(s) across ${jobs.length} job(s)`,
      "success",
    );
  } catch (error) {
    showStatus(`Error: ${error.message}`, "error");
  }
}

export async function fetchDiagnosticData() {
  const jobNumber = document.getElementById("jobNumber").value.trim();
  if (!jobNumber) {
    showStatus("Please enter a job number", "error");
    return;
  }

  currentJobNumber = jobNumber;
  currentPackingSlip = null;
  // Hide packing slip section when fetching by job
  document.getElementById("packingSlipLookup").style.display = "none";
  showStatus("Fetching diagnostic data...", "loading");

  try {
    const response = await fetch(`/processcert/build-cert?job=${jobNumber}`);

    const json = await response.json();

    if (!response.ok) {
      // Even on error, we may have error details in the JSON
      showStatus(
        `HTTP ${response.status}: ${json.error || json.details || response.statusText}`,
        "error",
      );

      // Display the error response for debugging
      document.getElementById("rawJSON").textContent = JSON.stringify(
        json,
        null,
        2,
      );
      return;
    }

    currentData = json;

    // Display raw JSON
    document.getElementById("rawJSON").textContent = JSON.stringify(
      json,
      null,
      2,
    );

    // Analyze and display
    analyzeData();
    showStatus("✓ Data loaded successfully", "success");
  } catch (error) {
    showStatus(`Error: ${error.message}`, "error");
  }
}

function analyzeData() {
  if (
    !currentData?.certificateData ||
    currentData.certificateData.length === 0
  ) {
    showStatus("No certificate data found", "error");
    return;
  }

  const entries = currentData.certificateData;

  // Show job info (all suffixes at once)
  showJobInfo(entries);

  // Analyze all operations from ALL suffixes combined
  analyzeAllOperations(entries);

  // Show final sections from ALL suffixes
  showFinalSections(entries);
}

function showJobInfo(entries) {
  const info = document.getElementById("jobInfo");
  const jobNum = entries[0]?.parentJ52?.job || "N/A";
  const suffixes = entries.map((e) => e.parentJ52?.suffix || "?").join(", ");

  // Count all hierarchy levels
  let totalChildren = 0;
  let totalGrandchildren = 0;
  entries.forEach((e) => {
    const childCount = e.childJobs?.length || 0;
    totalChildren += childCount;
    e.childJobs?.forEach((child) => {
      const grandchildCount = child.hierarchy?.grandchildren?.length || 0;
      totalGrandchildren += grandchildCount;
    });
  });

  const part = entries[0]?.parentJ52?.part || "N/A";
  const partDesc = entries[0]?.parentJ52?.partDescription || "";

  // Group entries by packing slip source job (if driven from PS)
  const psBySource = currentPackingSlip
    ? entries.reduce((acc, e) => {
        const src = e._psSourceJob || "unknown";
        if (!acc[src]) acc[src] = [];
        acc[src].push(`${e.parentJ52?.job}-${e.parentJ52?.suffix}`);
        return acc;
      }, {})
    : null;

  let psHierarchyHtml = "";
  if (psBySource) {
    psHierarchyHtml = `<div style="margin-top:8px; padding:8px; background:#f0fff0; border-left:3px solid #2e7d32; font-size:0.9em;">
      <strong>Packing Slip:</strong> ${currentPackingSlip} &nbsp;|&nbsp;
      <strong>PS Jobs → Hierarchies:</strong>
      <ul style="margin:4px 0 0 20px;">`;
    for (const [src, wos] of Object.entries(psBySource)) {
      psHierarchyHtml += `<li><strong>${src}</strong> → ${wos.join(", ")}</li>`;
    }
    psHierarchyHtml += `</ul></div>`;
  }

  info.innerHTML = `
    <div class="job-info">
      <strong>Job:</strong> ${jobNum} | 
      <strong>Suffixes:</strong> ${suffixes} | 
      <strong>Part:</strong> ${part}${partDesc ? ` (${partDesc})` : ""} | 
      <strong>Children:</strong> ${totalChildren} | 
      <strong>Grandchildren:</strong> ${totalGrandchildren}
    </div>
    ${psHierarchyHtml}
    <div style="margin-top: 10px; padding: 10px; background: #f0f8ff; border-left: 3px solid #0066cc; border-radius: 4px; font-size: 0.9em; color: #333;">
      <strong>ℹ Active API Filters (Certificate of Processing):</strong>
      <ul style="margin: 5px 0 0 20px; padding: 0;">
        <li><strong>Hierarchy Discovery:</strong> Recursively traverses Parent → Children → Grandchildren using CoC links</li>
        <li><strong>Child Discovery (Timebound):</strong> Only J55 entries between previous and current J52 timestamp are considered children of that parent</li>
        <li><strong>Grandchild Discovery:</strong> Unrestricted — all J55s from child job's history are checked for further descendants</li>
        <li><strong>SEQ Filter:</strong> ≥ 100 (excludes setup operations)</li>
        <li><strong>Opcode Blacklist:</strong> FINALI, ATTACH, REAM, SANDEB, COUNTS, KITTG, ASSEMB, SHEAR, PUNCH, INSP04, INSP05, BEND</li>
        <li><strong>Certificate Filter:</strong> Only SPECIAL PROCESSES shown on final cert (SPOTW, 6061, ALODINE, WELD, NADCAP, CHEM FILM, PASSIV)</li>
      </ul>
    </div>
  `;
}

function analyzeAllOperations(entries) {
  const allRawOps = document.getElementById("allRawOps");
  const allFilterAnalysis = document.getElementById("allFilterAnalysis");
  const allGrouping = document.getElementById("allGrouping");

  // Collect ALL operations from ALL entries (suffixes), parent + all children + all grandchildren
  let allOps = [];

  // Loop through all entries (all suffixes)
  entries.forEach((entry) => {
    // Add parent operations from this entry
    const parentOps = entry.hierarchy?.operations || [];
    if (parentOps.length > 0) {
      allOps.push(
        ...parentOps.map((op) => ({
          ...op,
          source: `Parent (${entry.parentJ52?.job}-${entry.parentJ52?.suffix})`,
          hierarchyLevel: "Parent",
        })),
      );
    }

    // Add all child operations from this entry
    const childJobs = entry.childJobs || [];
    childJobs.forEach((child) => {
      const childOps = child.hierarchy?.operations || [];
      if (childOps.length > 0) {
        allOps.push(
          ...childOps.map((op) => ({
            ...op,
            source: `Child (${child.childJob?.job}-${child.childJob?.suffix})`,
            hierarchyLevel: "Child",
          })),
        );
      }

      // Add grandchild operations
      const grandchildren = child.hierarchy?.grandchildren || [];
      grandchildren.forEach((grandchild) => {
        const grandchildOps = grandchild.hierarchy?.operations || [];
        if (grandchildOps.length > 0) {
          allOps.push(
            ...grandchildOps.map((op) => ({
              ...op,
              source: `Grandchild (${grandchild.childJob?.job}-${grandchild.childJob?.suffix})`,
              hierarchyLevel: "Grandchild",
            })),
          );
        }
      });
    });
  });

  if (allOps.length === 0) {
    allRawOps.innerHTML = '<div class="empty">No operations found</div>';
    allFilterAnalysis.innerHTML =
      '<div class="empty">No operations to analyze</div>';
    allGrouping.innerHTML = '<div class="empty">No operations to group</div>';
    return;
  }

  // Filter to show only "real" operations (not material/component filler rows)
  // Real operations have either: operation code, description, or are marked outside
  const realOps = allOps.filter((op) => {
    const hasOpCode = (op.operation || "").trim() !== "";
    const hasDesc = (op.description || "").trim() !== "";
    const hasPoNumber = (op.poNumber || "").trim() !== "";
    return hasOpCode || hasDesc || hasPoNumber || op.outsideProcessing;
  });

  const hiddenCount = allOps.length - realOps.length;

  // Raw operations table with toggle for filler rows
  let html = `
    <div style="margin-bottom: 10px;">
      <button id="toggleFillerRows" style="padding: 6px 12px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">
        Show Filler/Material Rows (${hiddenCount})
      </button>
    </div>
    <table>
      <thead>
        <tr>
          <th>Level</th>
          <th>Source</th>
          <th>PART</th>
          <th>Op Code</th>
          <th>Description</th>
          <th>SubOp</th>
          <th>LMO</th>
          <th>partWcOutside</th>
          <th>PO</th>
          <th>Outside?</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Get PART from first entry
  const part = entries[0]?.parentJ52?.part || "N/A";

  realOps.forEach((op) => {
    const outside = op.outsideProcessing ? "Yes" : "No";
    const outsideClass = op.outsideProcessing ? "flag-true" : "flag-false";
    const processName =
      `${op.operation || ""} ${op.partWcOutside?.trim() || op.description || ""}`.trim();
    const isSpecial = isSpecialProcess(processName);

    // Level-based color coding
    let levelColor = "#fff";
    if (op.hierarchyLevel === "Child") levelColor = "#e8f4f8";
    if (op.hierarchyLevel === "Grandchild") levelColor = "#f0e8f8";

    const specialClass = isSpecial
      ? ` style="background-color: #fff3cd; border-left: 4px solid #ff6b35; background-color: ${isSpecial ? "#fffacd" : levelColor};"`
      : ` style="background-color: ${levelColor};"`;

    html += `
      <tr${specialClass}>
        <td><strong>${op.hierarchyLevel || "?"}</strong></td>
        <td><strong>${op.source}</strong></td>
        <td><strong>${part}</strong></td>
        <td>${op.operation || ""}</td>
        <td class="truncate">${op.description || ""}</td>
        <td class="truncate">${op.subOpDescription || ""}</td>
        <td>${op.lmo || "N/A"}</td>
        <td class="truncate">${op.partWcOutside || ""}</td>
        <td>${op.poNumber || ""}</td>
        <td class="${outsideClass}">${outside}</td>
      </tr>
    `;
  });

  // Add filler rows (hidden by default)
  allOps
    .filter((op) => !realOps.includes(op))
    .forEach((op) => {
      html += `
      <tr class="filler-row" style="display: none; background-color: #f5f5f5; opacity: 0.6;">
        <td><strong>${op.hierarchyLevel || "?"}</strong></td>
        <td><strong>${op.source}</strong></td>
        <td><strong>${part}</strong></td>
        <td>${op.operation || ""}</td>
        <td class="truncate">${op.description || ""}</td>
        <td class="truncate">${op.subOpDescription || ""}</td>
        <td>${op.lmo || "N/A"}</td>
        <td class="truncate">${op.partWcOutside || ""}</td>
        <td>${op.poNumber || ""}</td>
        <td>No</td>
      </tr>
    `;
    });

  html += `</tbody></table>`;
  html += `<div style="margin-top: 10px; padding: 8px; background: #f9f9f9; border-left: 3px solid #999; font-size: 0.85em; color: #666;">
    <strong>ℹ Note:</strong> This table shows ALL operations returned by the API after backend filtering (SEQ ≥ 100, noise opcodes excluded).
    Operations highlighted in yellow are special processes (SPOTW, 6061, ALODINE, WELD, NADCAP, CHEM FILM, PASSIV).
    <strong>Hierarchy Levels:</strong> Parent (gray), Child (light blue), Grandchild (light purple).
    Only special processes appear on the final <em>Certificate of Processing</em>.
  </div>`;
  allRawOps.innerHTML = html;

  // Attach toggle handler
  const toggleBtn = document.getElementById("toggleFillerRows");
  if (toggleBtn) {
    let fillerVisible = false;
    toggleBtn.addEventListener("click", () => {
      fillerVisible = !fillerVisible;
      const fillerRows = allRawOps.querySelectorAll(".filler-row");
      fillerRows.forEach((row) => {
        row.style.display = fillerVisible ? "table-row" : "none";
      });
      toggleBtn.textContent = fillerVisible
        ? `Hide Filler/Material Rows (${hiddenCount})`
        : `Show Filler/Material Rows (${hiddenCount})`;
    });
  }

  // Filtering analysis
  const outsideOps = realOps.filter((op) => op.outsideProcessing);
  if (outsideOps.length === 0) {
    allFilterAnalysis.innerHTML =
      '<div class="empty">No operations marked as outsideProcessing</div>';
  } else {
    html = `<table><thead><tr><th>Source</th><th>Op</th><th>Description</th><th>Filter Status</th><th>Reason</th><th>Special?</th></tr></thead><tbody>`;

    outsideOps.forEach((op) => {
      const opDesc = (op.description || op.operation || "")
        .trim()
        .toUpperCase();
      const subDesc = (op.subOpDescription || "").trim().toUpperCase();
      const processName =
        `${op.operation || ""} ${op.partWcOutside?.trim() || op.description || ""}`.trim();
      const isSpecial = isSpecialProcess(processName);

      const isFiltered =
        TRULY_NON_CERT_OPS.includes(opDesc) ||
        TRULY_NON_CERT_OPS.includes(subDesc);
      const status = isFiltered ? "FILTERED OUT" : "PASSED";
      const reason = isFiltered
        ? opDesc.includes("MISCELLANEOUS")
          ? "Generic catch-all (MISCELLANEOUS)"
          : "Generic catch-all (PARTS TRANSFERRED)"
        : "Valid outside operation";
      const rowClass = isFiltered
        ? "filtered"
        : isSpecial
          ? "special"
          : "passed";
      const specialBadge = isSpecial
        ? '<span style="background-color: #ff6b35; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 0.85em;">★ YES</span>'
        : "No";

      html += `
        <tr class="${rowClass}" ${isSpecial ? 'style="background-color: #fff3cd; border-left: 4px solid #ff6b35;"' : ""}>
          <td><strong>${op.source}</strong></td>
          <td>${op.operation || ""}</td>
          <td class="truncate">${op.description || ""}</td>
          <td><strong>${status}</strong></td>
          <td>${reason}</td>
          <td>${specialBadge}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    allFilterAnalysis.innerHTML = html;
  }

  // Grouping results
  const groupedOps = groupOperations(outsideOps);
  if (Object.keys(groupedOps).length === 0) {
    allGrouping.innerHTML =
      '<div class="empty">No operations after filtering</div>';
  } else {
    html = "";
    for (const [processName, items] of Object.entries(groupedOps)) {
      const isSpecial = isSpecialProcess(processName);
      const specialStyle = isSpecial
        ? 'style="background-color: #fff3cd; border-left: 4px solid #ff6b35; padding: 8px;"'
        : "";
      const specialBadge = isSpecial
        ? ' <span style="background-color: #ff6b35; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.9em;">★ SPECIAL PROCESS</span>'
        : "";

      // Separate parent, child, and grandchild operations
      const parentOps = items.filter((op) => op.hierarchyLevel === "Parent");
      const childOps = items.filter((op) => op.hierarchyLevel === "Child");
      const grandchildOps = items.filter(
        (op) => op.hierarchyLevel === "Grandchild",
      );

      html += `
        <div class="grouping-item" ${specialStyle}>
          <strong>Process Name:</strong> ${processName || "(empty)"}${specialBadge} <br>
          <strong>Total Operations:</strong> ${items.length} row(s)
      `;

      if (parentOps.length > 0) {
        html += `<div style="margin-top: 8px; padding: 6px; background: rgba(200,200,200,0.2); border-left: 3px solid #999;">
          <strong>Level 1 (Parent) - ${parentOps.length} op(s):</strong>
          <ul style="margin: 5px 0 0 20px;">`;
        parentOps.forEach((op) => {
          html += `<li>[${op.source}] ${op.operation} (${op.description}) - PO: ${op.poNumber || "N/A"}</li>`;
        });
        html += `</ul></div>`;
      }

      if (childOps.length > 0) {
        html += `<div style="margin-top: 8px; padding: 6px; background: rgba(0,102,204,0.15); border-left: 3px solid #0066cc;">
          <strong>Level 2 (Child) - ${childOps.length} op(s):</strong>
          <ul style="margin: 5px 0 0 20px;">`;
        childOps.forEach((op) => {
          html += `<li>[${op.source}] ${op.operation} (${op.description}) - PO: ${op.poNumber || "N/A"}</li>`;
        });
        html += `</ul></div>`;
      }

      if (grandchildOps.length > 0) {
        html += `<div style="margin-top: 8px; padding: 6px; background: rgba(102,51,204,0.15); border-left: 3px solid #6633cc;">
          <strong>Level 3 (Grandchild) - ${grandchildOps.length} op(s):</strong>
          <ul style="margin: 5px 0 0 20px;">`;
        grandchildOps.forEach((op) => {
          html += `<li>[${op.source}] ${op.operation} (${op.description}) - PO: ${op.poNumber || "N/A"}</li>`;
        });
        html += `</ul></div>`;
      }

      html += `</div>`;
    }
    allGrouping.innerHTML = html;
  }
}

function groupOperations(ops) {
  const grouped = {};

  for (const op of ops) {
    // Apply filter
    const opDesc = (op.description || op.operation || "").trim().toUpperCase();
    const subDesc = (op.subOpDescription || "").trim().toUpperCase();

    if (
      TRULY_NON_CERT_OPS.includes(opDesc) ||
      TRULY_NON_CERT_OPS.includes(subDesc)
    ) {
      continue; // Skip filtered
    }

    // Get process name (include operation code first to catch codes like "6061")
    const processName =
      `${op.operation || ""} ${op.partWcOutside?.trim() || op.subOpDescription || op.description || ""}`.trim();

    if (!processName) continue;

    if (!grouped[processName]) {
      grouped[processName] = [];
    }
    grouped[processName].push(op);
  }

  return grouped;
}

function showFinalSections(entries) {
  const finalSections = document.getElementById("finalSections");
  let allSections = [];

  // Collect process sections from ALL entries (suffixes)
  entries.forEach((entry, idx) => {
    const sections = entry.processSections || [];
    allSections.push(
      ...sections.map((section) => ({
        ...section,
        suffix: entry.parentJ52?.suffix || "?",
      })),
    );
  });

  if (allSections.length === 0) {
    finalSections.innerHTML =
      '<div class="empty">No process sections on certificate</div>';
    return;
  }

  let html = `<table><thead><tr><th>Suffix</th><th>Process Name</th><th>PO Number</th><th>Rows</th><th>Details</th></tr></thead><tbody>`;

  allSections.forEach((section) => {
    const rowCount = (section.rows || []).length;
    const isSpecial = isSpecialProcess(section.processName);
    const specialStyle = isSpecial
      ? 'style="background-color: #fff3cd; border-left: 4px solid #ff6b35;"'
      : "";
    let details = "";
    (section.rows || []).forEach((row) => {
      details += `Part: ${row.part} (${row.partDesc}) | Qty: ${row.qty}<br>`;
    });

    html += `
      <tr ${specialStyle}>
        <td><strong>${section.suffix}</strong></td>
        <td><strong>${section.processName || "(empty)"}${isSpecial ? ' <span style="background-color: #ff6b35; color: white; padding: 2px 4px; font-size: 0.85em;">★</span>' : ""}</strong></td>
        <td>${section.poNumber || ""}</td>
        <td>${rowCount}</td>
        <td class="truncate" style="max-width: 400px;">${details}</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  finalSections.innerHTML = html;
}

// Toggle functionality removed - combined view shows all operations

export function toggleJSON() {
  const jsonPre = document.getElementById("rawJSON");
  jsonPre.style.display = jsonPre.style.display === "none" ? "block" : "none";
}

function showStatus(message, type) {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  if (type === "success") {
    setTimeout(() => {
      statusDiv.textContent = "";
      statusDiv.className = "status";
    }, 3000);
  }
}
