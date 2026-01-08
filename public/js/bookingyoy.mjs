import { loadHeaderFooter, myport } from "./utils.mjs";

loadHeaderFooter();
const port = myport();

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

let yoyChartInstance = null;

window.addEventListener("DOMContentLoaded", () => {
  const startYearSelect = document.getElementById("startYear");
  const endYearSelect = document.getElementById("endYear");

  // Load data when years change
  startYearSelect.addEventListener("change", () => loadYoYData());
  endYearSelect.addEventListener("change", () => loadYoYData());

  // Initial load
  loadYoYData();

  async function loadYoYData() {
    const startYear = parseInt(startYearSelect.value);
    const endYear = parseInt(endYearSelect.value);

    if (startYear > endYear) {
      alert("Start year must be less than or equal to end year");
      return;
    }

    try {
      const response = await fetch("/bookingmonthly/yoy-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startYear, endYear }),
      });

      if (!response.ok) {
        console.error("Error loading YoY data");
        return;
      }

      const data = await response.json();
      renderYoYTable(data, startYear, endYear);
      renderYoYChart(data, startYear, endYear);
      renderSummaryStats(data, startYear, endYear);
    } catch (error) {
      console.error("Error fetching YoY data:", error);
    }
  }

  function renderYoYTable(data, startYear, endYear) {
    const table = document.getElementById("yoyTable");
    const tbody = table.querySelector("tbody");

    // Build header with years
    const headerRow = table.querySelector("thead tr");
    headerRow.innerHTML = "<th>Month</th>";
    for (let year = startYear; year <= endYear; year++) {
      const th = document.createElement("th");
      th.textContent = year;
      headerRow.appendChild(th);
    }

    // Add growth column if comparing 2+ years
    if (endYear > startYear) {
      const th = document.createElement("th");
      th.textContent = "Growth %";
      headerRow.appendChild(th);
    }

    // Build body rows
    tbody.innerHTML = "";
    for (let month = 0; month < 12; month++) {
      const tr = document.createElement("tr");
      const monthCell = document.createElement("td");
      monthCell.textContent = monthLabels[month];
      monthCell.style.fontWeight = "bold";
      tr.appendChild(monthCell);

      const monthData = data.filter((d) => d.month === month + 1);
      const yearlyData = {};
      monthData.forEach((d) => {
        yearlyData[d.year] = d.total;
      });

      // Add values for each year
      for (let year = startYear; year <= endYear; year++) {
        const td = document.createElement("td");
        const value = yearlyData[year] || 0;
        td.textContent = value.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
        tr.appendChild(td);
      }

      // Add growth percentage
      if (endYear > startYear) {
        const td = document.createElement("td");
        const startValue = yearlyData[startYear] || 0;
        const endValue = yearlyData[endYear] || 0;
        const growth =
          startValue > 0
            ? ((endValue - startValue) / startValue) * 100
            : endValue > 0
            ? 100
            : 0;

        td.classList.add(growth >= 0 ? "growth-positive" : "growth-negative");
        td.textContent = growth.toFixed(1) + "%";
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }

    // Add totals row
    const totalsRow = document.createElement("tr");
    totalsRow.style.backgroundColor = "#e0e8ff";
    totalsRow.style.fontWeight = "bold";
    const totalsLabelCell = document.createElement("td");
    totalsLabelCell.textContent = "TOTAL";
    totalsRow.appendChild(totalsLabelCell);

    const yearTotals = {};
    for (let year = startYear; year <= endYear; year++) {
      const total = data
        .filter((d) => d.year === year)
        .reduce((sum, d) => sum + (d.total || 0), 0);
      yearTotals[year] = total;

      const td = document.createElement("td");
      td.style.color = "green";
      td.textContent = total.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      totalsRow.appendChild(td);
    }

    // Add total growth
    if (endYear > startYear) {
      const td = document.createElement("td");
      const startTotal = yearTotals[startYear] || 0;
      const endTotal = yearTotals[endYear] || 0;
      const totalGrowth =
        startTotal > 0
          ? ((endTotal - startTotal) / startTotal) * 100
          : endTotal > 0
          ? 100
          : 0;
      td.classList.add(
        totalGrowth >= 0 ? "growth-positive" : "growth-negative"
      );
      td.textContent = totalGrowth.toFixed(1) + "%";
      totalsRow.appendChild(td);
    }

    tbody.appendChild(totalsRow);
  }

  function renderYoYChart(data, startYear, endYear) {
    const chartCanvas = document.getElementById("yoyChart");
    if (!chartCanvas) return;

    // Prepare data for each year
    const datasets = [];
    const colors = [
      "#4C7AF5",
      "#50C878",
      "#FF6B6B",
      "#FFA500",
      "#9B59B6",
      "#1ABC9C",
      "#E74C3C",
    ];

    for (let year = startYear; year <= endYear; year++) {
      const yearData = monthLabels.map((_, month) => {
        const monthNum = month + 1;
        const record = data.find(
          (d) => d.year === year && d.month === monthNum
        );
        return record ? record.total : 0;
      });

      datasets.push({
        label: year.toString(),
        data: yearData,
        borderColor: colors[(year - startYear) % colors.length],
        backgroundColor: colors[(year - startYear) % colors.length] + "20",
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
      });
    }

    // Destroy existing chart if it exists
    if (yoyChartInstance) {
      yoyChartInstance.destroy();
    }

    // Create new chart
    const ctx = chartCanvas.getContext("2d");
    yoyChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: monthLabels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
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
                const value = context.parsed.y;
                return `${context.dataset.label}: $${value.toLocaleString()}`;
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
              text: "Booking Value ($)",
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
            },
          },
        },
      },
    });
  }

  function renderSummaryStats(data, startYear, endYear) {
    const summaryDiv = document.getElementById("summaryStats");

    const yearTotals = {};
    for (let year = startYear; year <= endYear; year++) {
      const total = data
        .filter((d) => d.year === year)
        .reduce((sum, d) => sum + (d.total || 0), 0);
      yearTotals[year] = total;
    }

    let html = '<div style="display: flex; gap: 30px; font-size: 1em;">';

    for (let year = startYear; year <= endYear; year++) {
      const total = yearTotals[year];
      const monthsWithData = data.filter(
        (d) => d.year === year && d.total > 0
      ).length;
      const avgMonthly = monthsWithData > 0 ? total / 12 : 0; // Average across all 12 months

      html += `
        <div>
          <strong>${year}</strong><br/>
          Year Total: <span style="color: green; font-weight: bold;">
            ${total.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span><br/>
          Monthly Avg: <span style="color: #0066cc; font-weight: bold;">
            ${avgMonthly.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      `;
    }

    // Add comparison if multiple years
    if (endYear > startYear) {
      const startTotal = yearTotals[startYear] || 0;
      const endTotal = yearTotals[endYear] || 0;
      const growth =
        startTotal > 0
          ? ((endTotal - startTotal) / startTotal) * 100
          : endTotal > 0
          ? 100
          : 0;

      // Calculate annual average across all years selected
      const allYearsTotal = Object.values(yearTotals).reduce(
        (sum, val) => sum + val,
        0
      );
      const numYears = endYear - startYear + 1;
      const annualAverage = allYearsTotal / numYears;

      const growthClass = growth >= 0 ? "growth-positive" : "growth-negative";

      html += `
        <div>
          <strong>${startYear} → ${endYear}</strong><br/>
          Growth: <span class="${growthClass}">
            ${growth.toFixed(1)}%
          </span><br/>
          Absolute: <span style="font-weight: bold;">
            ${(endTotal - startTotal).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
        <div>
          <strong>Annual Average</strong><br/>
          <span style="color: #ff9800; font-size: 1.2em; font-weight: bold;">
            ${annualAverage.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      `;
    }

    html += "</div>";
    summaryDiv.innerHTML = html;
  }
});
