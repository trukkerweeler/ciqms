import { loadHeaderFooter, myport } from "./utils.mjs";

loadHeaderFooter();
const port = myport();

let trendChartInstance = null; // Global chart instance

// Month labels for chart
const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Handles P&L account details fetch and UI rendering
window.addEventListener("DOMContentLoaded", () => {
  const yearPicker = document.getElementById("yearPicker");
  const pnlTable = document.getElementById("pnlTable");
  const addManualGLBtn = document.getElementById("addManualGLBtn");
  const manualGLDialog = document.getElementById("manualGLDialog");
  const manualGLForm = document.getElementById("manualGLForm");
  const cancelGLBtn = document.getElementById("cancelGLBtn");
  const glEntriesBody = document.getElementById("glEntriesBody");
  const addRowBtn = document.getElementById("addRowBtn");

  let glEntries = []; // Store entries in memory
  let currentMonth = new Date().getMonth() + 1; // Track selected month
  const today = new Date();
  const defaultYear =
    today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();

  // Load trend chart when year changes
  yearPicker.addEventListener("change", async () => {
    const year = yearPicker.value;
    if (!year) return;
    await loadAndRenderTrendChart(year);
  });

  // Fetch detail data for a given month/year
  async function fetchPnLDetails(year, month) {
    if (!year || !month) return;

    // Fetch account details
    const detailsResponse = await fetch("/pnlmonthly/account-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
    });
    if (!detailsResponse.ok) {
      pnlTable.innerHTML =
        '<tr><td colspan="4">Error loading account details</td></tr>';
      return;
    }
    const detailsData = await detailsResponse.json();

    // Fetch adjustments
    const adjustmentsResponse = await fetch("/pnlmonthly/adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
    });
    if (!adjustmentsResponse.ok) {
      console.error("Error loading adjustments data");
      renderAccountDetails(detailsData, []);
      return;
    }
    const adjustmentsData = await adjustmentsResponse.json();

    renderAccountDetails(detailsData, adjustmentsData);
  }

  function renderAccountDetails(data, adjustments) {
    if (!data || !data.length) {
      pnlTable.innerHTML = '<tr><td colspan="4">No data found</td></tr>';
      return;
    }

    // Group by category
    const grouped = {};
    let grandTotal = 0;

    for (const row of data) {
      if (!grouped[row.Category]) grouped[row.Category] = [];
      grouped[row.Category].push(row);
      grandTotal += Number(row.Total);
    }

    let html = `<tr><th>GL Account</th><th>Category</th><th>Amount</th><th>Transactions</th></tr>`;

    // Define category order and calculate category totals
    const categoryOrder = [
      "Revenue",
      "COGS",
      "SG&A",
      "Other Income/Expense",
      "Taxes",
      "Unclassified",
    ];
    const categoryTotals = {};

    for (const category of categoryOrder) {
      if (!grouped[category]) continue;

      let categoryTotal = 0;

      for (const account of grouped[category]) {
        const amount = Number(account.Total);
        categoryTotal += amount;

        html += `<tr>
          <td><a href="#" class="account-link" data-glaccount="${
            account.GL_ACCOUNT
          }">${account.AccountDisplay}</a></td>
          <td>${account.Category}</td>
          <td style="font-weight:bold">${amount.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}</td>
          <td>${account.TransactionCount}</td>
        </tr>`;
      }

      // Add category subtotal
      categoryTotals[category] = categoryTotal;
      html += `<tr style="background:#f0f0f0;font-weight:bold">
        <td colspan="2" style="text-align:right">${category} Total:</td>
        <td>${categoryTotal.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}</td>
        <td></td>
      </tr>`;
    }

    // Calculate profit
    const revenue = Math.abs(categoryTotals["Revenue"] || 0);
    const cogs = categoryTotals["COGS"] || 0;
    const sga = categoryTotals["SG&A"] || 0;
    const taxes = categoryTotals["Taxes"] || 0;
    const profit = revenue - cogs - sga - taxes;

    // Calculate manual adjustments total by account type
    let adjustmentsRevenue = 0;
    let adjustmentsCOGS = 0;
    let adjustmentsSGA = 0;
    let adjustmentsTaxes = 0;

    if (adjustments && adjustments.length > 0) {
      for (const adj of adjustments) {
        const amount = Number(adj.AMOUNT);
        const glAccount = Number(adj.GL_ACCOUNT);

        if (glAccount >= 400 && glAccount <= 499) {
          // Revenue accounts - negative amounts reduce revenue, positive amounts increase revenue
          adjustmentsRevenue -= amount;
        } else if (glAccount >= 500 && glAccount <= 599) {
          // COGS accounts
          adjustmentsCOGS += amount;
        } else if (glAccount >= 600 && glAccount <= 799) {
          // SG&A accounts
          adjustmentsSGA += amount;
        } else if (
          (glAccount >= 445 && glAccount <= 447) ||
          (glAccount >= 707 && glAccount <= 750)
        ) {
          // Other Income/Expense
          adjustmentsSGA += amount;
        } else if (glAccount >= 900 && glAccount <= 999) {
          // Tax accounts
          adjustmentsTaxes += amount;
        }
      }
    }

    // Calculate adjusted profit
    const adjustedProfit =
      revenue +
      adjustmentsRevenue -
      (cogs + adjustmentsCOGS) -
      (sga + adjustmentsSGA) -
      (taxes + adjustmentsTaxes);
    const totalAdjustments =
      adjustmentsRevenue + adjustmentsCOGS + adjustmentsSGA + adjustmentsTaxes;

    // Add grand total
    html += `<tr style="background:#e0e8ff;font-weight:bold;font-size:1.1em">
      <td colspan="2" style="text-align:right">Net Profit:</td>
      <td style="color:${
        profit >= 0 ? "green" : "red"
      }">${profit.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    })}</td>
      <td></td>
    </tr>`;

    // Add adjusted profit row if there are manual adjustments
    if (totalAdjustments !== 0) {
      html += `<tr style="background:#d0e0ff;font-weight:bold;font-size:1.1em">
        <td colspan="2" style="text-align:right">Net Profit (with Adjustments):</td>
        <td style="color:${
          adjustedProfit >= 0 ? "green" : "red"
        }">${adjustedProfit.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
        <td></td>
      </tr>`;
    }

    pnlTable.innerHTML = html;

    // Attach click handlers to account links
    document.querySelectorAll(".account-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const glAccount = e.target.dataset.glaccount;
        showAccountDrillDown(glAccount);
      });
    });

    // Render adjustments table
    renderAdjustmentsTable(adjustments);
  }

  // Function to show drill-down dialog for a GL account
  async function showAccountDrillDown(glAccount) {
    const year = yearPicker.value;
    const month = currentMonth;

    const drillDownDialog = document.getElementById("drillDownDialog");
    const drillDownTable = document.getElementById("drillDownTable");
    const drillDownTitle = document.getElementById("drillDownTitle");
    drillDownTitle.textContent = `Transactions for GL Account ${glAccount}`;
    drillDownTable.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';
    drillDownDialog.showModal();

    try {
      const response = await fetch("/pnlmonthly/account-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, glAccount }),
      });

      if (!response.ok) {
        drillDownTable.innerHTML =
          '<tr><td colspan="9">Error loading transactions</td></tr>';
        return;
      }

      const transactions = await response.json();

      // Also fetch corrections for this GL account (across all periods)
      const correctionsResponse = await fetch(
        "/gldetail?gl_account=" + glAccount,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      let corrections = [];
      if (correctionsResponse.ok) {
        const allCorrections = await correctionsResponse.json();
        // Filter corrections for this GL account in CORR batch (our corrections)
        corrections = allCorrections.filter(
          (c) =>
            c.GL_ACCOUNT == glAccount &&
            c.BATCH_NUM &&
            c.BATCH_NUM.startsWith("X")
        );
      }

      renderDrillDownTable(transactions, corrections, glAccount);
    } catch (error) {
      console.error("Error fetching account transactions:", error);
      drillDownTable.innerHTML =
        '<tr><td colspan="9">Error loading transactions</td></tr>';
    }
  }

  function renderDrillDownTable(
    transactions,
    corrections = [],
    glAccount = null
  ) {
    const drillDownTable = document.getElementById("drillDownTable");
    const drillDownDialog = document.getElementById("drillDownDialog");

    if (!transactions || !transactions.length) {
      drillDownTable.innerHTML =
        '<tr><td colspan="8">No transactions found</td></tr>';
      return;
    }
    let html = `<tr>
      <th>Date</th>
      <th>Invoice</th>
      <th>Batch</th>
      <th>Line</th>
      <th>Reference</th>
      <th>Description</th>
      <th>Vendor</th>
      <th>Amount</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>`;

    let total = 0;
    for (const txn of transactions) {
      const formattedDate = new Date(txn.POST_DATE).toLocaleDateString();
      const amount = Number(txn.AMOUNT);
      total += amount;

      // Check if this transaction has been corrected
      // Look for a REVERSAL correction entry that specifically matches this transaction
      // Match by: original BATCH_NUM and BATCH_LINE must be in reversal reference or description AND amount must be negated
      const reversalExists = corrections.some((c) => {
        if (!c.REFERENCE || !c.REFERENCE.includes("REVERSAL")) return false;
        // Check if reversal references the exact same transaction by batch info
        // Look for the pattern like "A5321:00004" in REFERENCE or DESCR
        const batchPattern = `orig ${txn.BATCH_NUM}:${txn.BATCH_LINE}`;
        const reversalHasBatchInfo =
          (c.REFERENCE && c.REFERENCE.includes(batchPattern)) ||
          (c.DESCR && c.DESCR.includes(batchPattern));
        const reversalAmountMatches =
          Math.abs(Number(c.AMOUNT)) === Math.abs(Number(txn.AMOUNT));

        // Debug
        if (c.REFERENCE.includes("REVERSAL")) {
          console.log("Checking reversal:", {
            batchPattern,
            reversalRef: c.REFERENCE,
            reversalDesc: c.DESCR,
            hasBatchInfo: reversalHasBatchInfo,
            amountMatches: reversalAmountMatches,
            txnBatch: `${txn.BATCH_NUM}:${txn.BATCH_LINE}`,
          });
        }

        return reversalHasBatchInfo && reversalAmountMatches;
      });

      const isCorrected = reversalExists;
      const statusBadge = isCorrected
        ? '<span style="background:#90EE90;color:#000;padding:2px 6px;border-radius:3px;font-size:0.8em;font-weight:bold">✓ CORRECTED</span>'
        : '<span style="background:#f0f0f0;color:#666;padding:2px 6px;border-radius:3px;font-size:0.8em">Original</span>';

      html += `<tr ${isCorrected ? 'style="background:#f0fdf4"' : ""}>
        <td>${formattedDate}</td>
        <td>${txn.INVOICE_NO || ""}</td>
        <td>${txn.BATCH_NUM || ""}</td>
        <td>${txn.BATCH_LINE || ""}</td>
        <td>${txn.REFERENCE || ""}</td>
        <td>${txn.DESCR || ""}</td>
        <td>${txn.VENDOR || ""}</td>
        <td style="font-weight:bold">${amount.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn-small" style="padding: 2px 6px; font-size: 0.85em" onclick="correctGLTransaction('${
            txn.GL_ACCOUNT
          }', '${txn.POST_DATE}', '${txn.REFERENCE || ""}', '${
        txn.DESCR || ""
      }', ${txn.AMOUNT}, '${txn.VENDOR || ""}', '${txn.BATCH_NUM || ""}', '${
        txn.BATCH_LINE || ""
      }')">Correct</button>
        </td>
      </tr>`;
    }

    // Add total row
    html += `<tr style="background:#eef;font-weight:bold">
      <td colspan="9" style="text-align:right">Total Accruals:</td>
      <td>${total.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
    </tr>`;

    drillDownTable.innerHTML = html;

    // Remove any existing corrections section from previous drill-down opens
    const existingCorrectionsSection = drillDownTable.nextElementSibling;
    if (
      existingCorrectionsSection &&
      existingCorrectionsSection.style.marginTop === "30px"
    ) {
      existingCorrectionsSection.remove();
    }

    // Add corrections section if there are any
    if (corrections && corrections.length > 0) {
      const correctionsSectionHtml = createCorrectionsSection(corrections);
      drillDownTable.insertAdjacentHTML("afterend", correctionsSectionHtml);
    }
  }

  function createCorrectionsSection(corrections) {
    if (!corrections || corrections.length === 0) return "";

    let html = `<div style="margin-top: 30px; padding: 15px; background: #f9f5ff; border-left: 4px solid #9333ea; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #7e22ce">Applied Corrections</h3>
      <p style="font-size: 0.9em; color: #666; margin: 0 0 10px 0">
        The following correction entries have been applied to adjust the accrual period:
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 0.9em">
        <tr style="background: #ede9fe; border-bottom: 2px solid #9333ea">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #9333ea">Type</th>
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #9333ea">Post Date</th>
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #9333ea">Reference</th>
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #9333ea">Description</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #9333ea">Amount</th>
        </tr>`;

    for (const corr of corrections) {
      const formattedDate = new Date(corr.POST_DATE).toLocaleDateString();
      const amount = Number(corr.AMOUNT);
      const isReversal = corr.REFERENCE && corr.REFERENCE.includes("REVERSAL");
      const typeLabel = isReversal ? "Reversal" : "Correction";
      const typeColor = isReversal ? "#ef4444" : "#22c55e";

      html += `<tr style="border-bottom: 1px solid #e9d5ff">
        <td style="padding: 8px">
          <span style="background: ${typeColor}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 0.85em; font-weight: bold">
            ${typeLabel}
          </span>
        </td>
        <td style="padding: 8px">${formattedDate}</td>
        <td style="padding: 8px"><code style="background: #f3e8ff; padding: 2px 4px; border-radius: 2px; font-size: 0.85em">${
          corr.REFERENCE
        }</code></td>
        <td style="padding: 8px">${corr.DESCR}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold; color: ${
          amount < 0 ? "#ef4444" : "#22c55e"
        }">
          ${amount.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        </td>
      </tr>`;
    }
    html += `</table>
    </div>`;

    return html;
  }

  function renderAdjustmentsTable(adjustments) {
    const adjustmentsContainer = document.getElementById("adjustmentsTable");
    if (!adjustmentsContainer) return;

    if (!adjustments || !adjustments.length) {
      adjustmentsContainer.innerHTML =
        '<tr><td colspan="7">No manual adjustments found</td></tr>';
      return;
    }

    let html = `<tr>
      <th>GL Account</th>
      <th>Post Date</th>
      <th>Reference</th>
      <th>Description</th>
      <th>Vendor</th>
      <th>Amount</th>
      <th>Actions</th>
    </tr>`;

    let total = 0;
    for (const adj of adjustments) {
      const formattedDate = new Date(adj.POST_DATE).toLocaleDateString();
      const amount = Number(adj.AMOUNT);
      total += amount;
      html += `<tr>
        <td>${adj.GL_ACCOUNT}</td>
        <td>${formattedDate}</td>
        <td>${adj.REFERENCE || ""}</td>
        <td>${adj.DESCR || ""}</td>
        <td>${adj.VENDOR || ""}</td>
        <td style="font-weight:bold">${amount.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}</td>
        <td>
          <button class="btn-small" style="padding: 2px 6px; font-size: 0.85em" onclick="editAdjustment('${
            adj.BATCH_NUM
          }', '${adj.BATCH_LINE}')">Edit</button>
          <button class="btn-small btn-danger" style="padding: 2px 6px; font-size: 0.85em" onclick="deleteAdjustment('${
            adj.BATCH_NUM
          }', '${adj.BATCH_LINE}')">Delete</button>
        </td>
      </tr>`;
    }

    // Add total row
    html += `<tr style="background:#eef;font-weight:bold">
      <td colspan="5" style="text-align:right">Total:</td>
      <td>${total.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
      <td></td>
    </tr>`;

    adjustmentsContainer.innerHTML = html;
  }

  // Helper function to calculate period fields from POST_DATE
  function updatePeriodFields() {
    const postDateField = document.getElementById("post_date_global");
    if (!postDateField) return;

    const postDateVal = postDateField.value;
    if (!postDateVal) return;

    const tDate = new Date(postDateVal);
    if (isNaN(tDate.getTime())) return;

    // Calculate PERIOD_BEG_DATE (first day of the month) in YYYYMMDD format
    const firstDay = new Date(tDate.getFullYear(), tDate.getMonth(), 1);
    const periodBegDate = firstDay
      .toISOString()
      .split("T")[0]
      .replace(/-/g, "");

    // Calculate PERIOD_END_DATE (last day of the month) in YYYYMMDD format
    const lastDay = new Date(tDate.getFullYear(), tDate.getMonth() + 1, 0);
    const periodEndDate = lastDay.toISOString().split("T")[0].replace(/-/g, "");

    // Store these for later use when submitting entries
    manualGLDialog.dataset.periodBegDate = periodBegDate;
    manualGLDialog.dataset.periodEndDate = periodEndDate;
  }

  // Create a new GL entry row
  function createGLEntryRow(index, data = {}) {
    const today = new Date().toISOString().split("T")[0];
    const postDate = data.POST_DATE ? data.POST_DATE.split("T")[0] : today;
    const tDate = data.T_DATE ? data.T_DATE.split("T")[0] : today;

    return `
      <tr data-row-index="${index}" style="border-bottom: 1px solid #eee">
        <td style="padding: 5px; text-align: center; background: #f9f9f9">${
          index + 1
        }</td>
        <td style="padding: 5px">
          <input type="text" class="gl-account" value="${
            data.GL_ACCOUNT || "560"
          }" style="width: 100%; padding: 2px" maxlength="5" />
        </td>
        <td style="padding: 5px">
          <input type="date" class="post-date" value="${postDate}" style="width: 100%; padding: 2px" />
        </td>
        <td style="padding: 5px">
          <input type="date" class="t-date" value="${tDate}" style="width: 100%; padding: 2px" />
        </td>
        <td style="padding: 5px">
          <input type="text" class="reference" value="${
            data.REFERENCE || ""
          }" style="width: 100%; padding: 2px" />
        </td>
        <td style="padding: 5px">
          <input type="number" class="amount" value="${
            data.AMOUNT || ""
          }" step="0.01" style="width: 100%; padding: 2px; text-align: right" />
        </td>
        <td style="padding: 5px">
          <input type="text" class="descr" value="${
            data.DESCR || ""
          }" style="width: 100%; padding: 2px" />
        </td>
        <td style="padding: 5px">
          <input type="text" class="vendor" value="${
            data.VENDOR || ""
          }" style="width: 100%; padding: 2px" />
        </td>
        <td style="padding: 5px">
          <div style="display: flex; gap: 2px">
            <input type="text" class="appl-type" value="${
              data.APPL_TYPE || ""
            }" style="width: 48%; padding: 2px; font-size: 0.85em" maxlength="6" placeholder="App" title="Application Type" />
            <input type="text" class="tran-type" value="${
              data.TRAN_TYPE || ""
            }" style="width: 48%; padding: 2px; font-size: 0.85em" maxlength="6" placeholder="Tran" title="Transaction Type" />
          </div>
        </td>
        <td style="padding: 5px">
          <div style="display: flex; gap: 2px">
            <input type="text" class="ar-code" value="${
              data.AR_CODE || "I"
            }" style="width: 48%; padding: 2px; font-size: 0.85em" maxlength="1" placeholder="AR" title="AR Code" />
            <input type="date" class="invc-date" value="${
              data.INVC_DATE ? data.INVC_DATE.split("T")[0] : ""
            }" style="width: 48%; padding: 2px; font-size: 0.85em" />
          </div>
        </td>
        <td style="padding: 5px; text-align: center">
          <button type="button" class="delete-row btn-danger" style="padding: 2px 6px; font-size: 0.8em">✕</button>
        </td>
      </tr>
    `;
  }

  // Render all GL entry rows
  function renderGLEntryRows() {
    glEntriesBody.innerHTML = glEntries
      .map((entry, index) => createGLEntryRow(index, entry))
      .join("");

    // Attach delete handlers
    document.querySelectorAll(".delete-row").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const rowIndex = parseInt(e.target.closest("tr").dataset.rowIndex);
        glEntries.splice(rowIndex, 1);
        renderGLEntryRows();
      });
    });
  }

  // Add new empty row
  addRowBtn.addEventListener("click", (e) => {
    e.preventDefault();
    glEntries.push({});
    renderGLEntryRows();
  });

  // Open manual GL entry dialog
  addManualGLBtn.addEventListener("click", () => {
    glEntries = [{}]; // Start with one empty row
    manualGLForm.reset();

    // Set default dates to today
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("post_date_global").value = today;
    document.getElementById("t_date_global").value = today;
    document.getElementById("batch_num").value = "TK";

    // Calculate period fields from POST_DATE
    updatePeriodFields();

    // Render initial empty row
    renderGLEntryRows();

    // Hide correction button for new entries
    document.getElementById("createCorrectionBtn").style.display = "none";
    manualGLDialog.dataset.editMode = "false";

    manualGLDialog.showModal();
  });

  // Update period fields when POST_DATE changes
  document
    .getElementById("post_date_global")
    .addEventListener("change", updatePeriodFields);

  // Close dialog on cancel
  cancelGLBtn.addEventListener("click", () => {
    manualGLDialog.close();
  });

  // Handle form submission - save all entries
  manualGLForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const batchNum = document.getElementById("batch_num").value;
    const postDateGlobal = document.getElementById("post_date_global").value;
    const tDateGlobal = document.getElementById("t_date_global").value;
    const periodBegDate = manualGLDialog.dataset.periodBegDate;
    const periodEndDate = manualGLDialog.dataset.periodEndDate;

    if (!batchNum || !postDateGlobal || !tDateGlobal) {
      alert("Please fill in Batch Number and default dates");
      return;
    }

    // Collect all entries from the table
    const entries = [];
    let batchLine = 1;

    document.querySelectorAll("#glEntriesBody tr").forEach((row) => {
      const glAccount = row.querySelector(".gl-account").value.trim();
      const postDate = row.querySelector(".post-date").value || postDateGlobal;
      const tDate = row.querySelector(".t-date").value || tDateGlobal;
      const reference = row.querySelector(".reference").value.trim();
      const amount = row.querySelector(".amount").value.trim();
      const descr = row.querySelector(".descr").value.trim();
      const vendor = row.querySelector(".vendor").value.trim();
      const applType = row.querySelector(".appl-type").value.trim();
      const tranType = row.querySelector(".tran-type").value.trim();
      const arCode = row.querySelector(".ar-code").value.trim() || "I";
      const invcDate = row.querySelector(".invc-date").value;

      // Skip empty rows
      if (!glAccount && !amount && !descr) return;

      // Validate required fields
      if (!glAccount || !amount || !descr) {
        alert("Each entry must have: GL Account, Amount, and Description");
        throw new Error("Validation failed");
      }

      entries.push({
        GL_ACCOUNT: glAccount,
        POST_DATE: postDate,
        BATCH_NUM: batchNum,
        BATCH_LINE: batchLine,
        T_DATE: tDate,
        PERIOD: String(new Date(postDate).getMonth() + 1).padStart(2, "0"),
        PERIOD_BEG_DATE: periodBegDate,
        PERIOD_END_DATE: periodEndDate,
        REFERENCE: reference,
        AMOUNT: parseFloat(amount),
        DB_CR_FLAG: "D",
        DESCR: descr,
        APPL_TYPE: applType,
        TRAN_TYPE: tranType,
        VENDOR: vendor,
        AR_CODE: arCode,
        INVC_DATE: invcDate,
      });

      batchLine++;
    });

    if (entries.length === 0) {
      alert("Please add at least one entry");
      return;
    }

    try {
      // Submit all entries
      const response = await fetch(`http://localhost:${port}/gldetail/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entries }),
      });

      if (response.ok) {
        alert(
          `${entries.length} GL Entr${
            entries.length === 1 ? "y" : "ies"
          } saved successfully!`
        );
        manualGLDialog.close();
        // Refresh the P&L table
        fetchBtn.click();
      } else {
        const error = await response.json();
        alert(`Failed to save GL entries: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error("Error submitting GL entries:", error);
      alert("An error occurred while submitting GL entries.");
    }
  });

  // Close drill-down dialog
  document.getElementById("closeDrillDownBtn").addEventListener("click", () => {
    document.getElementById("drillDownDialog").close();
  });

  // Close drill-down dialog on outside click
  const drillDownDialog = document.getElementById("drillDownDialog");
  drillDownDialog.addEventListener("click", (e) => {
    if (e.target === drillDownDialog) {
      drillDownDialog.close();
    }
  });

  // Global function to edit an adjustment
  window.editAdjustment = async function (batchNum, batchLine) {
    try {
      const response = await fetch(
        `http://localhost:${port}/gldetail/${batchNum}/${batchLine}`
      );
      if (!response.ok) {
        alert("Failed to load adjustment details");
        return;
      }

      const adjustment = await response.json();

      // Load the adjustment into glEntries and open dialog in edit mode
      glEntries = [adjustment];

      // Populate global fields
      document.getElementById("batch_num").value = adjustment.BATCH_NUM;
      document.getElementById("post_date_global").value = adjustment.POST_DATE
        ? adjustment.POST_DATE.split("T")[0]
        : new Date().toISOString().split("T")[0];
      document.getElementById("t_date_global").value = adjustment.T_DATE
        ? adjustment.T_DATE.split("T")[0]
        : new Date().toISOString().split("T")[0];

      // Update period fields
      updatePeriodFields();

      // Render the row
      renderGLEntryRows();

      // Open dialog in edit mode
      manualGLDialog.dataset.editMode = "true";
      manualGLDialog.dataset.batchNum = batchNum;
      manualGLDialog.dataset.batchLine = batchLine;
      document.getElementById("createCorrectionBtn").style.display = "block";
      manualGLDialog.showModal();
    } catch (error) {
      console.error("Error loading adjustment:", error);
      alert("An error occurred while loading the adjustment.");
    }
  };

  // Correction dialog handlers
  const correctionDialog = document.getElementById("correctionDialog");
  const correctionForm = document.getElementById("correctionForm");
  const cancelCorrectionBtn = document.getElementById("cancelCorrectionBtn");
  const createCorrectionBtn = document.getElementById("createCorrectionBtn");

  cancelCorrectionBtn.addEventListener("click", () => {
    correctionDialog.close();
  });

  createCorrectionBtn.addEventListener("click", () => {
    // Show correction dialog
    correctionDialog.showModal();
  });

  correctionForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const correctPostDate = document.getElementById(
      "correction_post_date"
    ).value;

    if (!correctPostDate) {
      alert("Please enter a correct post date");
      return;
    }

    // Calculate period info for correct date
    const correctDate = new Date(correctPostDate + "T00:00:00");
    const correctMonth = String(correctDate.getMonth() + 1).padStart(2, "0");
    const correctYear = correctDate.getFullYear();
    const correctPeriod = correctMonth;

    // Calculate period dates
    const periodBegDate = new Date(correctYear, correctDate.getMonth(), 1);
    const periodEndDate = new Date(correctYear, correctDate.getMonth() + 1, 0);

    const periodBegDateStr = periodBegDate.toISOString().split("T")[0];
    const periodEndDateStr = periodEndDate.toISOString().split("T")[0];

    let entry;

    // Check if correcting a GL transaction or manual entry
    if (correctionDialog.dataset.glAccount) {
      // Correcting a GL transaction from drill-down
      console.log("Creating correction entry from GL transaction:", {
        glAccount: correctionDialog.dataset.glAccount,
        postDate: correctionDialog.dataset.postDate,
      });

      entry = {
        GL_ACCOUNT: correctionDialog.dataset.glAccount,
        POST_DATE: correctionDialog.dataset.postDate,
        BATCH_NUM: "CORR", // Use CORR batch for corrections
        T_DATE: correctionDialog.dataset.postDate,
        PERIOD: String(
          new Date(correctionDialog.dataset.postDate).getMonth() + 1
        ).padStart(2, "0"),
        PERIOD_BEG_DATE: new Date(
          new Date(correctionDialog.dataset.postDate).getFullYear(),
          new Date(correctionDialog.dataset.postDate).getMonth(),
          1
        )
          .toISOString()
          .split("T")[0],
        PERIOD_END_DATE: new Date(
          new Date(correctionDialog.dataset.postDate).getFullYear(),
          new Date(correctionDialog.dataset.postDate).getMonth() + 1,
          0
        )
          .toISOString()
          .split("T")[0],
        REFERENCE: correctionDialog.dataset.reference,
        AMOUNT: parseFloat(correctionDialog.dataset.amount),
        DB_CR_FLAG: "D",
        DESCR: correctionDialog.dataset.description,
        APPL_TYPE: "",
        TRAN_TYPE: "",
        VENDOR: correctionDialog.dataset.vendor,
        AR_CODE: "",
        INVC_DATE: "",
      };

      console.log("Entry object created with GL_ACCOUNT:", entry.GL_ACCOUNT);

      // Clear the GL transaction fields after use
      correctionDialog.dataset.glAccount = "";
    } else {
      // Correcting a manual entry
      if (glEntries.length === 0 || !glEntries[0].BATCH_NUM) {
        alert("No entry selected");
        return;
      }
      entry = glEntries[0];
    }

    try {
      // Debug: Build the request body separately to log it
      const requestBody = {
        GL_ACCOUNT: entry.GL_ACCOUNT,
        POST_DATE: entry.POST_DATE,
        BATCH_NUM: entry.BATCH_NUM,
        T_DATE: entry.T_DATE,
        PERIOD: entry.PERIOD,
        PERIOD_BEG_DATE: entry.PERIOD_BEG_DATE,
        PERIOD_END_DATE: entry.PERIOD_END_DATE,
        REFERENCE: entry.REFERENCE || "",
        AMOUNT: entry.AMOUNT,
        DB_CR_FLAG: entry.DB_CR_FLAG,
        DESCR: entry.DESCR || "",
        APPL_TYPE: entry.APPL_TYPE || "",
        TRAN_TYPE: entry.TRAN_TYPE || "",
        VENDOR: entry.VENDOR || "",
        AR_CODE: entry.AR_CODE || "",
        INVC_DATE: entry.INVC_DATE || "",
        CORRECT_POST_DATE: correctPostDate,
        CORRECT_PERIOD: correctPeriod,
        CORRECT_PERIOD_BEG_DATE: periodBegDateStr,
        CORRECT_PERIOD_END_DATE: periodEndDateStr,
        ORIG_BATCH_NUM: correctionDialog.dataset.batchNum,
        ORIG_BATCH_LINE: correctionDialog.dataset.batchLine,
      };

      console.log(
        "About to send correction request with GL_ACCOUNT:",
        requestBody.GL_ACCOUNT
      );
      console.log("Full request body:", requestBody);

      const response = await fetch(
        `http://localhost:${port}/gldetail/createCorrection`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      // Debug: Log what was sent
      console.log("Correction request GL_ACCOUNT:", entry.GL_ACCOUNT);
      console.log("Full correction entry:", entry);

      if (response.ok) {
        const result = await response.json();
        console.log(
          `Correction entries created - Reversal: BL ${result.reversalBatchLine}, Correction: BL ${result.correctionBatchLine}`
        );
        correctionDialog.close();
        manualGLDialog.close();
        // Refresh the P&L details to reload adjustments
        fetchPnLDetails(today.getFullYear(), currentMonth);
      } else {
        const error = await response.json();
        alert(`Failed to create correction: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating correction:", error);
      alert("An error occurred while creating the correction entries.");
    }
  });

  // Show/hide correction button based on edit mode
  window.addEventListener("editModeChanged", () => {
    const isEditMode = manualGLDialog.dataset.editMode === "true";
    createCorrectionBtn.style.display = isEditMode ? "block" : "none";
  });

  // Restore drill-down dialog handlers that were at the end
  window.deleteAdjustment = async function (batchNum, batchLine) {
    if (!confirm("Are you sure you want to delete this manual adjustment?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:${port}/pnlmonthly/adjustments/${batchNum}/${batchLine}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        alert("Manual adjustment deleted successfully!");
        fetchPnLDetails(yearPicker.value, currentMonth); // Refresh the tables
      } else {
        const error = await response.json();
        alert(`Failed to delete adjustment: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting adjustment:", error);
      alert("An error occurred while deleting the adjustment.");
    }
  };

  // Global function to correct a GL transaction
  window.correctGLTransaction = function (
    glAccount,
    postDate,
    reference,
    description,
    amount,
    vendor,
    batchNum,
    batchLine
  ) {
    // Debug: Log incoming parameters
    console.log("correctGLTransaction called with:", {
      glAccount,
      postDate,
      reference,
      description,
      amount,
      vendor,
      batchNum,
      batchLine,
    });

    // Store transaction info in the dialog for use in the correction handler
    correctionDialog.dataset.glAccount = glAccount;
    correctionDialog.dataset.postDate = postDate;
    correctionDialog.dataset.reference = reference;
    correctionDialog.dataset.description = description;
    correctionDialog.dataset.amount = amount;
    correctionDialog.dataset.vendor = vendor;
    correctionDialog.dataset.batchNum = batchNum;
    correctionDialog.dataset.batchLine = batchLine;

    // Debug: Verify dataset was set correctly
    console.log("Dataset after assignment:", {
      glAccount: correctionDialog.dataset.glAccount,
      postDate: correctionDialog.dataset.postDate,
      reference: correctionDialog.dataset.reference,
      description: correctionDialog.dataset.description,
      amount: correctionDialog.dataset.amount,
      vendor: correctionDialog.dataset.vendor,
      batchNum: correctionDialog.dataset.batchNum,
      batchLine: correctionDialog.dataset.batchLine,
    });

    // Set the title to show what transaction is being corrected
    const txnDate = new Date(postDate).toLocaleDateString();
    document.getElementById(
      "correctionTitle"
    ).textContent = `Create Correction for GL ${glAccount} (${txnDate})`;

    // Clear the correction date field
    document.getElementById("correction_post_date").value = "";

    correctionDialog.showModal();
  };

  // Load and render yearly trend chart
  async function loadAndRenderTrendChart(year) {
    try {
      const response = await fetch("/pnlmonthly/yearly-trend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });

      if (!response.ok) {
        console.error("Error loading yearly trend data");
        return;
      }

      const trendData = await response.json();
      renderTrendChart(trendData);
    } catch (error) {
      console.error("Error fetching yearly trend data:", error);
    }
  }

  // Render Chart.js trend chart
  function renderTrendChart(data) {
    const chartCanvas = document.getElementById("trendChart");
    if (!chartCanvas) return;

    // Extract data for each metric
    const revenueData = data.map((m) => m.revenue);
    const cogsData = data.map((m) => m.cogs);
    const sgaData = data.map((m) => m.sga);
    const netIncomeData = data.map((m) => m.netIncome);
    const grossMarginPercentData = data.map((m) =>
      parseFloat(m.grossMarginPercent)
    );

    // Destroy existing chart if it exists
    if (trendChartInstance) {
      trendChartInstance.destroy();
    }

    // Create new chart
    const ctx = chartCanvas.getContext("2d");
    trendChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: "Revenue",
            data: revenueData,
            borderColor: "rgb(75, 192, 75)",
            backgroundColor: "rgba(75, 192, 75, 0.1)",
            borderWidth: 2,
            yAxisID: "y",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
          },
          {
            label: "COGS",
            data: cogsData,
            borderColor: "rgb(255, 99, 132)",
            backgroundColor: "rgba(255, 99, 132, 0.1)",
            borderWidth: 2,
            yAxisID: "y",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
          },
          {
            label: "SG&A",
            data: sgaData,
            borderColor: "rgb(255, 193, 7)",
            backgroundColor: "rgba(255, 193, 7, 0.1)",
            borderWidth: 2,
            yAxisID: "y",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
          },
          {
            label: "Net Income",
            data: netIncomeData,
            borderColor: "rgb(54, 108, 255)",
            backgroundColor: "rgba(54, 108, 255, 0.1)",
            borderWidth: 3,
            yAxisID: "y",
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.3,
          },
          {
            label: "Gross Margin %",
            data: grossMarginPercentData,
            borderColor: "rgb(153, 102, 255)",
            backgroundColor: "rgba(153, 102, 255, 0.1)",
            borderWidth: 2,
            yAxisID: "y1",
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.3,
            borderDash: [5, 5],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const monthIndex = elements[0].index;
            const selectedMonth = monthIndex + 1;
            currentMonth = selectedMonth;
            const year = yearPicker.value;
            fetchPnLDetails(year, selectedMonth);
            // Scroll to detail section
            setTimeout(() => {
              document
                .querySelector("h2")
                .scrollIntoView({ behavior: "smooth" });
            }, 100);
          }
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0,0,0,0.8)",
            padding: 12,
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  if (context.dataset.yAxisID === "y1") {
                    label += context.parsed.y.toFixed(1) + "%";
                  } else {
                    label += "$" + context.parsed.y.toLocaleString();
                  }
                }
                return label;
              },
            },
          },
        },
        scales: {
          y: {
            type: "linear",
            display: true,
            position: "left",
            title: {
              display: true,
              text: "Amount ($)",
            },
            ticks: {
              callback: function (value) {
                return "$" + (value / 1000).toFixed(0) + "K";
              },
            },
            grid: {
              color: function (context) {
                if (context.tick.value === 0) {
                  return "rgba(0, 0, 0, 0.8)";
                }
                return "rgba(0, 0, 0, 0.1)";
              },
              lineWidth: function (context) {
                if (context.tick.value === 0) {
                  return 3;
                }
                return 1;
              },
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            title: {
              display: true,
              text: "Gross Margin %",
            },
            ticks: {
              callback: function (value) {
                return value.toFixed(0) + "%";
              },
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    });
  }

  // Initial load for current month and year
  currentMonth = today.getMonth() + 1;
  yearPicker.value = defaultYear;
  loadAndRenderTrendChart(defaultYear).catch(console.error);
  fetchPnLDetails(defaultYear, currentMonth);
});
