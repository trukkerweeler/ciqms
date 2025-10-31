// Handles P&L summary fetch and UI rendering
window.addEventListener("DOMContentLoaded", () => {
  const yearPicker = document.getElementById("yearPicker");
  const pnlTable = document.getElementById("pnlTable");
  const fetchBtn = document.getElementById("fetchPnlBtn");

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
    let html = `<tr><th>Month</th><th>Revenue</th><th>COGS</th><th>SG&A</th><th>Taxes</th><th>Profit</th></tr>`;
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

  // Initial load for current year
  yearPicker.value = new Date().getFullYear();
  fetchBtn.click();
});
