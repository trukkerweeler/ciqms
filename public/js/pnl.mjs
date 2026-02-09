import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

// Handles P&L summary fetch and UI rendering
window.addEventListener("DOMContentLoaded", async () => {
  const apiUrl = await getApiUrl();
  const yearPicker = document.getElementById("yearPicker");
  const pnlTable = document.getElementById("pnlTable");
  const fetchBtn = document.getElementById("fetchPnlBtn");
  const addManualGLBtn = document.getElementById("addManualGLBtn");
  const manualGLDialog = document.getElementById("manualGLDialog");
  const manualGLForm = document.getElementById("manualGLForm");
  const cancelGLBtn = document.getElementById("cancelGLBtn");

  fetchBtn.addEventListener("click", async () => {
    const year = yearPicker.value;
    if (!year) return;
    const response = await fetch("/pnl/monthly-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year }),
    });
    if (!response.ok) {
      pnlTable.innerHTML = '<tr><td colspan="3">Error loading data</td></tr>';
      return;
    }
    const data = await response.json();
    renderPnlTable(data);
  });

  function renderPnlTable(data) {
    if (!data || !data.length) {
      pnlTable.innerHTML = '<tr><td colspan="6">No data found</td></tr>';
      return;
    }
    // Group by month
    const grouped = {};
    for (const row of data) {
      if (!grouped[row.Month]) grouped[row.Month] = {};
      grouped[row.Month][row.Category] = Number(row.Total);
    }
    let html = `<tr><th>Month</th><th>Revenue</th><th>COGS</th><th>COGS %</th><th>SG&A</th><th>Taxes</th><th>Profit</th></tr>`;
    let totalProfit = 0;
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalSga = 0;
    let totalTaxes = 0;
    for (const month of Object.keys(grouped)) {
      let rev = grouped[month]["Revenue"] || 0;
      const cogs = grouped[month]["COGS"] || 0;
      const sga = grouped[month]["SG&A"] || 0;
      const taxes = grouped[month]["Taxes"] || 0;
      // Always show Revenue as positive
      const revDisplay = Math.abs(rev);
      // Show COGS, SG&A, Taxes with their actual sign
      const profit = revDisplay - cogs - sga - taxes;
      totalProfit += profit;
      totalRevenue += revDisplay;
      totalCogs += cogs;
      totalSga += sga;
      totalTaxes += taxes;
      const cogsPercent =
        revDisplay > 0 ? ((cogs / revDisplay) * 100).toFixed(1) : "0.0";
      html += `<tr>
          <td>${month}</td>
          <td>${revDisplay.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}</td>
          <td>${cogs.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}</td>
          <td>${cogsPercent}%</td>
          <td>${sga.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}</td>
          <td>${taxes.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}</td>
          <td style="font-weight:bold;color:${
            profit >= 0 ? "green" : "red"
          }">${profit.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}</td>
        </tr>`;
    }
    // Add summary row for total Revenue, COGS, SG&A, Taxes, and Profit for the year
    const totalCogsPercent =
      totalRevenue > 0 ? ((totalCogs / totalRevenue) * 100).toFixed(1) : "0.0";
    html += `<tr style="background:#eef;font-weight:bold">
      <td style="text-align:right">Year Total:</td>
      <td>${totalRevenue.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
      <td>${totalCogs.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
      <td>${totalCogsPercent}%</td>
      <td>${totalSga.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
      <td>${totalTaxes.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
      <td style="color:${
        totalProfit >= 0 ? "green" : "red"
      }">${totalProfit.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
    </tr>`;
    pnlTable.innerHTML = html;
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
        document.getElementById("period_beg_date").value,
      ),
      PERIOD_END_DATE: formatDateToYYYYMMDD(
        document.getElementById("period_end_date").value,
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
      const response = await fetch(`${apiUrl}/gldetail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        alert("GL Entry added successfully!");
        manualGLDialog.close();
        // Refresh the P&L table
        fetchBtn.click();
      } else {
        const error = await response.json();
        alert(`Failed to add GL Entry: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error("Error submitting GL entry:", error);
      alert("An error occurred while submitting the GL entry.");
    }
  });

  // Initial load for current year
  yearPicker.value = new Date().getFullYear();
  fetchBtn.click();
});
