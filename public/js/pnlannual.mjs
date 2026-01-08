import { loadHeaderFooter, myport } from "./utils.mjs";

loadHeaderFooter();
const port = myport();

let trendChartInstance = null; // Global chart instance

// Year labels for chart - will be populated dynamically
let yearLabels = [];

// Handles P&L annual trend fetch and UI rendering
window.addEventListener("DOMContentLoaded", async () => {
  const pnlTable = document.getElementById("pnlTable");
  const selectedYearDisplay = document.getElementById("selectedYearDisplay");

  let currentYear = new Date().getFullYear(); // Track selected year

  // Fetch detail data for a given year
  async function fetchPnLAnnualDetails(year) {
    if (!year) return;

    // Fetch account details
    const detailsResponse = await fetch("/pnlmonthly/annual-account-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year }),
    });
    if (!detailsResponse.ok) {
      pnlTable.innerHTML =
        '<tr><td colspan="4">Error loading account details</td></tr>';
      return;
    }
    const detailsData = await detailsResponse.json();

    renderAccountDetails(detailsData, year);
    selectedYearDisplay.textContent = year;
  }

  function renderAccountDetails(data, year) {
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

    // Define category order
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
          }" data-year="${year}">${account.AccountDisplay}</a></td>
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
    const revenue = categoryTotals["Revenue"] || 0;
    const cogs = categoryTotals["COGS"] || 0;
    const sga = categoryTotals["SG&A"] || 0;
    const taxes = categoryTotals["Taxes"] || 0;
    const profit = revenue - cogs - sga - taxes;

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

    pnlTable.innerHTML = html;

    // Attach click handlers to account links
    document.querySelectorAll(".account-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const glAccount = e.target.dataset.glaccount;
        const linkedYear = e.target.dataset.year;
        showAccountDrillDown(glAccount, linkedYear);
      });
    });
  }

  // Function to show drill-down dialog for a GL account
  async function showAccountDrillDown(glAccount, year) {
    const drillDownDialog = document.getElementById("drillDownDialog");
    const drillDownTable = document.getElementById("drillDownTable");
    const drillDownTitle = document.getElementById("drillDownTitle");

    drillDownTitle.textContent = `Transactions for GL Account ${glAccount} (${year})`;
    drillDownTable.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';
    drillDownDialog.showModal();

    try {
      const response = await fetch("/pnlmonthly/annual-account-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, glAccount }),
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
      <td colspan="6" style="text-align:right">Total:</td>
      <td>${total.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
    </tr>`;

    drillDownTable.innerHTML = html;
  }

  // Render year summary cards
  function renderYearSummaries(data) {
    const summaryDiv = document.getElementById("yearSummary");
    if (!summaryDiv) return;

    let html =
      '<div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 0.95em;">';

    for (const year of data) {
      const revenue = Number(year.revenue);
      const cogs = Number(year.cogs);
      const sga = Number(year.sga);
      const netIncome = Number(year.netIncome);
      const grossMargin = parseFloat(year.grossMarginPercent);

      html += `
        <div style="background: white; padding: 12px; border: 1px solid #ddd; border-radius: 6px; min-width: 200px;">
          <strong style="font-size: 1.1em;">${year.year}</strong><br/>
          <div style="margin-top: 6px;">
            Revenue: <span style="color: green; font-weight: bold;">
              ${revenue.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
          <div>
            COGS: <span style="color: red; font-weight: bold;">
              ${cogs.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
          <div>
            SG&A: <span style="color: orange; font-weight: bold;">
              ${sga.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
          <div style="border-top: 1px solid #ddd; margin-top: 6px; padding-top: 6px;">
            Net Income: <span style="color: #0066cc; font-weight: bold;">
              ${netIncome.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
          <div>
            Gross Margin: <span style="color: #9900cc; font-weight: bold;">
              ${grossMargin.toFixed(1)}%
            </span>
          </div>
        </div>
      `;
    }

    html += "</div>";
    summaryDiv.innerHTML = html;
  }

  // Load and render annual trend chart
  async function loadAndRenderAnnualTrendChart() {
    try {
      const response = await fetch("/pnlmonthly/annual-trend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        console.error("Error loading annual trend data");
        return;
      }

      const trendData = await response.json();
      if (trendData.length > 0) {
        currentYear = trendData[trendData.length - 1].year; // Set to latest year
      }
      renderAnnualTrendChart(trendData);
      fetchPnLAnnualDetails(currentYear);
    } catch (error) {
      console.error("Error fetching annual trend data:", error);
    }
  }

  // Render Chart.js annual trend chart
  function renderAnnualTrendChart(data) {
    const chartCanvas = document.getElementById("annualTrendChart");
    if (!chartCanvas) return;

    // Extract data for each metric
    yearLabels = data.map((d) => d.year.toString());
    const revenueData = data.map((d) => d.revenue);
    const cogsData = data.map((d) => d.cogs);
    const sgaData = data.map((d) => d.sga);
    const netIncomeData = data.map((d) => d.netIncome);
    const grossMarginPercentData = data.map((d) =>
      parseFloat(d.grossMarginPercent)
    );

    // Render year summaries
    renderYearSummaries(data);

    // Destroy existing chart if it exists
    if (trendChartInstance) {
      trendChartInstance.destroy();
    }

    // Create new chart
    const ctx = chartCanvas.getContext("2d");
    trendChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: yearLabels,
        datasets: [
          {
            label: "Revenue",
            data: revenueData,
            borderColor: "rgb(75, 192, 75)",
            backgroundColor: "rgba(75, 192, 75, 0.1)",
            borderWidth: 2,
            yAxisID: "y",
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.3,
          },
          {
            label: "COGS",
            data: cogsData,
            borderColor: "rgb(255, 99, 132)",
            backgroundColor: "rgba(255, 99, 132, 0.1)",
            borderWidth: 2,
            yAxisID: "y",
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.3,
          },
          {
            label: "SG&A",
            data: sgaData,
            borderColor: "rgb(255, 193, 7)",
            backgroundColor: "rgba(255, 193, 7, 0.1)",
            borderWidth: 2,
            yAxisID: "y",
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.3,
          },
          {
            label: "Net Income",
            data: netIncomeData,
            borderColor: "rgb(54, 108, 255)",
            backgroundColor: "rgba(54, 108, 255, 0.1)",
            borderWidth: 3,
            yAxisID: "y",
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.3,
          },
          {
            label: "Gross Margin %",
            data: grossMarginPercentData,
            borderColor: "rgb(153, 102, 255)",
            backgroundColor: "rgba(153, 102, 255, 0.1)",
            borderWidth: 2,
            yAxisID: "y1",
            pointRadius: 4,
            pointHoverRadius: 6,
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
            const yearIndex = elements[0].index;
            currentYear = parseInt(yearLabels[yearIndex]);
            fetchPnLAnnualDetails(currentYear);
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
                return "$" + (value / 1000000).toFixed(2) + "M";
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

  // Initial load
  loadAndRenderAnnualTrendChart().catch(console.error);
});
