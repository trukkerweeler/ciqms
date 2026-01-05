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
    drillDownTable.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';
    drillDownDialog.showModal();

    try {
      const response = await fetch("/pnlmonthly/account-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, glAccount }),
      });

      if (!response.ok) {
        drillDownTable.innerHTML =
          '<tr><td colspan="8">Error loading transactions</td></tr>';
        return;
      }

      const transactions = await response.json();
      renderDrillDownTable(transactions);
    } catch (error) {
      console.error("Error fetching account transactions:", error);
      drillDownTable.innerHTML =
        '<tr><td colspan="8">Error loading transactions</td></tr>';
    }
  }

  function renderDrillDownTable(transactions) {
    const drillDownTable = document.getElementById("drillDownTable");

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
    </tr>`;

    let total = 0;
    for (const txn of transactions) {
      const formattedDate = new Date(txn.POST_DATE).toLocaleDateString();
      const amount = Number(txn.AMOUNT);
      total += amount;

      html += `<tr>
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
      </tr>`;
    }

    // Add total row
    html += `<tr style="background:#eef;font-weight:bold">
      <td colspan="7" style="text-align:right">Total Accruals:</td>
      <td>${total.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
    </tr>`;

    drillDownTable.innerHTML = html;
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
      manualGLDialog.showModal();
    } catch (error) {
      console.error("Error loading adjustment:", error);
      alert("An error occurred while loading the adjustment.");
    }
  };

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
  const today = new Date();
  currentMonth = today.getMonth() + 1;
  yearPicker.value = today.getFullYear();
  loadAndRenderTrendChart(today.getFullYear()).catch(console.error);
  fetchPnLDetails(today.getFullYear(), currentMonth);
});
