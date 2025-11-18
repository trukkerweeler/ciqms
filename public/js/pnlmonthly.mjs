import { loadHeaderFooter, myport } from "./utils.mjs";

loadHeaderFooter();
const port = myport();

// Handles P&L account details fetch and UI rendering
window.addEventListener("DOMContentLoaded", () => {
  const monthPicker = document.getElementById("monthPicker");
  const yearPicker = document.getElementById("yearPicker");
  const pnlTable = document.getElementById("pnlTable");
  const fetchBtn = document.getElementById("fetchPnlBtn");
  const addManualGLBtn = document.getElementById("addManualGLBtn");
  const manualGLDialog = document.getElementById("manualGLDialog");
  const manualGLForm = document.getElementById("manualGLForm");
  const cancelGLBtn = document.getElementById("cancelGLBtn");

  fetchBtn.addEventListener("click", async () => {
    const year = yearPicker.value;
    const month = monthPicker.value;
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
  });

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
          // Revenue accounts
          adjustmentsRevenue += Math.abs(amount);
        } else if (glAccount >= 500 && glAccount <= 599) {
          // COGS accounts
          adjustmentsCOGS += amount;
        } else if (glAccount >= 600 && glAccount <= 799) {
          // SG&A accounts
          adjustmentsSGA += amount;
        } else if ((glAccount >= 445 && glAccount <= 447) || (glAccount >= 707 && glAccount <= 750)) {
          // Other Income/Expense
          adjustmentsSGA += amount;
        } else if (glAccount >= 900 && glAccount <= 999) {
          // Tax accounts
          adjustmentsTaxes += amount;
        }
      }
    }

    // Calculate adjusted profit
    const adjustedProfit = (revenue + adjustmentsRevenue) - (cogs + adjustmentsCOGS) - (sga + adjustmentsSGA) - (taxes + adjustmentsTaxes);
    const totalAdjustments = adjustmentsRevenue + adjustmentsCOGS + adjustmentsSGA + adjustmentsTaxes;

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
    const month = monthPicker.value;

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
      <td colspan="7" style="text-align:right">Total:</td>
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

    for (const adj of adjustments) {
      const formattedDate = new Date(adj.POST_DATE).toLocaleDateString();
      html += `<tr>
        <td>${adj.GL_ACCOUNT}</td>
        <td>${formattedDate}</td>
        <td>${adj.REFERENCE || ""}</td>
        <td>${adj.DESCR || ""}</td>
        <td>${adj.VENDOR || ""}</td>
        <td style="font-weight:bold">${Number(adj.AMOUNT).toLocaleString(
          "en-US",
          {
            style: "currency",
            currency: "USD",
          }
        )}</td>
        <td>
          <button class="btn-small" onclick="editAdjustment('${
            adj.BATCH_NUM
          }', '${adj.BATCH_LINE}')">Edit</button>
          <button class="btn-small btn-danger" onclick="deleteAdjustment('${
            adj.BATCH_NUM
          }', '${adj.BATCH_LINE}')">Delete</button>
        </td>
      </tr>`;
    }

    adjustmentsContainer.innerHTML = html;
  }

  // Function to calculate period fields from T_DATE
  function updatePeriodFields() {
    const tDateField = document.getElementById("t_date");
    if (!tDateField) return;

    const tDateVal = tDateField.value;
    if (!tDateVal) return;

    const tDate = new Date(tDateVal);
    if (isNaN(tDate.getTime())) return;

    // Calculate PERIOD as 2-digit month (MM)
    const month = String(tDate.getMonth() + 1).padStart(2, "0");
    const periodField = document.getElementById("period");
    if (periodField) {
      periodField.value = month;
    }

    // Calculate PERIOD_BEG_DATE (first day of the month) in YYYY-MM-DD format for date input
    const firstDay = new Date(tDate.getFullYear(), tDate.getMonth(), 1);
    const periodBegDate = firstDay.toISOString().split("T")[0];
    const periodBegField = document.getElementById("period_beg_date");
    if (periodBegField) {
      periodBegField.value = periodBegDate;
    }

    // Calculate PERIOD_END_DATE (last day of the month) in YYYY-MM-DD format for date input
    const lastDay = new Date(tDate.getFullYear(), tDate.getMonth() + 1, 0);
    const periodEndDate = lastDay.toISOString().split("T")[0];
    const periodEndField = document.getElementById("period_end_date");
    if (periodEndField) {
      periodEndField.value = periodEndDate;
    }
  }

  // Open manual GL entry dialog
  addManualGLBtn.addEventListener("click", () => {
    manualGLForm.reset();
    // Set default dates to today
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("post_date").value = today;
    document.getElementById("t_date").value = today;

    // Calculate period fields from T_DATE
    updatePeriodFields();

    // Clear edit mode
    delete manualGLDialog.dataset.editMode;
    delete manualGLDialog.dataset.batchNum;
    delete manualGLDialog.dataset.batchLine;

    manualGLDialog.showModal();
  });

  // Update period fields when T_DATE changes
  document
    .getElementById("t_date")
    .addEventListener("change", updatePeriodFields);

  // Close dialog on cancel
  cancelGLBtn.addEventListener("click", () => {
    manualGLDialog.close();
  });

  // Close drill-down dialog
  document.getElementById("closeDrillDownBtn").addEventListener("click", () => {
    document.getElementById("drillDownDialog").close();
  });

  // Handle form submission
  manualGLForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Helper function to convert YYYY-MM-DD to YYYYMMDD
    const formatDateToYYYYMMDD = (dateStr) => {
      if (!dateStr) return "";
      return dateStr.replace(/-/g, "");
    };

    const formData = {
      GL_ACCOUNT: document.getElementById("gl_account").value,
      POST_DATE: document.getElementById("post_date").value,
      BATCH_NUM: document.getElementById("batch_num").value,
      BATCH_LINE: parseInt(document.getElementById("batch_line").value),
      T_DATE: document.getElementById("t_date").value,
      PERIOD: document.getElementById("period").value,
      PERIOD_BEG_DATE: formatDateToYYYYMMDD(
        document.getElementById("period_beg_date").value
      ),
      PERIOD_END_DATE: formatDateToYYYYMMDD(
        document.getElementById("period_end_date").value
      ),
      REFERENCE: document.getElementById("reference").value,
      AMOUNT: parseFloat(document.getElementById("amount").value),
      DB_CR_FLAG: "D",
      DESCR: document.getElementById("descr").value,
      APPL_TYPE: document.getElementById("appl_type").value,
      TRAN_TYPE: document.getElementById("tran_type").value,
      VENDOR: document.getElementById("vendor").value,
      AR_CODE: document.getElementById("ar_code").value,
      INVC_DATE: document.getElementById("invc_date").value,
    };

    try {
      // Check if we're in edit mode
      const isEditMode = manualGLDialog.dataset.editMode === "true";

      const response = await fetch(`http://localhost:${port}/gldetail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          isEditMode
            ? "GL Entry updated successfully!"
            : "GL Entry added successfully!"
        );
        manualGLDialog.close();
        // Refresh the P&L table
        fetchBtn.click();
      } else {
        const error = await response.json();
        alert(
          `Failed to ${isEditMode ? "update" : "add"} GL Entry: ${
            error.details || error.error
          }`
        );
      }
    } catch (error) {
      console.error("Error submitting GL entry:", error);
      alert("An error occurred while submitting the GL entry.");
    }
  });

  // Global functions for edit and delete (attached to window)
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

      // Populate form with existing data
      document.getElementById("gl_account").value = adjustment.GL_ACCOUNT;
      document.getElementById("post_date").value = adjustment.POST_DATE
        ? adjustment.POST_DATE.split("T")[0]
        : "";
      document.getElementById("batch_num").value = adjustment.BATCH_NUM;
      document.getElementById("batch_line").value = adjustment.BATCH_LINE;
      document.getElementById("t_date").value = adjustment.T_DATE
        ? adjustment.T_DATE.split("T")[0]
        : "";
      document.getElementById("reference").value = adjustment.REFERENCE || "";
      document.getElementById("amount").value = adjustment.AMOUNT;
      document.getElementById("descr").value = adjustment.DESCR || "";
      document.getElementById("appl_type").value = adjustment.APPL_TYPE || "";
      document.getElementById("tran_type").value = adjustment.TRAN_TYPE || "";
      document.getElementById("vendor").value = adjustment.VENDOR || "";
      document.getElementById("ar_code").value = adjustment.AR_CODE || "I";
      document.getElementById("invc_date").value = adjustment.INVC_DATE
        ? adjustment.INVC_DATE.split("T")[0]
        : "";

      // Update period fields
      updatePeriodFields();

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
        fetchBtn.click(); // Refresh the tables
      } else {
        const error = await response.json();
        alert(`Failed to delete adjustment: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting adjustment:", error);
      alert("An error occurred while deleting the adjustment.");
    }
  };

  // Initial load for current month and year
  const today = new Date();
  monthPicker.value = today.getMonth() + 1;
  yearPicker.value = today.getFullYear();
  fetchBtn.click();
});
