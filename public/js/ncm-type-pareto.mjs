// Pareto chart for NCM Types
import { getApiUrl, loadHeaderFooter } from "./utils.mjs";

loadHeaderFooter();

let chartInstance = null;

async function generateChart() {
  const apiUrl = await getApiUrl();
  const chartCanvas = document.getElementById("ncmTypePieChart");
  if (!chartCanvas) return;

  // Get selected time period
  const timePeriod = document.querySelector(
    'input[name="timePeriod"]:checked',
  ).value;

  try {
    const response = await fetch(
      `${apiUrl}/ncm/types-pie?period=${timePeriod}`,
    );
    if (!response.ok) throw new Error("Failed to fetch NCM type data");
    const data = await response.json();
    if (!data.labels || !data.counts) throw new Error("Invalid data format");

    // Sort data by count descending
    const sortedData = data.labels
      .map((label, i) => ({ label, count: data.counts[i] }))
      .sort((a, b) => b.count - a.count);

    const sortedLabels = sortedData.map((d) => d.label);
    const sortedCounts = sortedData.map((d) => d.count);

    // Calculate cumulative percentage
    const total = sortedCounts.reduce((a, b) => a + b, 0);
    let cumulative = 0;
    const cumulativePercentage = sortedCounts.map((count) => {
      cumulative += count;
      return (cumulative / total) * 100;
    });

    // Determine chart title based on selection
    let chartTitle = "NCM Types (Pareto)";
    if (timePeriod === "calendar") {
      const prevYear = new Date().getFullYear() - 1;
      chartTitle = `NCM Types - ${prevYear} (Pareto)`;
    } else {
      chartTitle = "NCM Types - Last 12 Months (Pareto)";
    }

    // Destroy existing chart if it exists
    if (chartInstance) {
      chartInstance.destroy();
    }

    // Create new Pareto chart
    chartInstance = new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels: sortedLabels,
        datasets: [
          {
            label: "Count",
            data: sortedCounts,
            backgroundColor: "rgba(75, 192, 192, 0.7)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
            yAxisID: "y",
            order: 2,
          },
          {
            label: "Cumulative %",
            data: cumulativePercentage,
            borderColor: "rgba(255, 99, 132, 1)",
            backgroundColor: "rgba(255, 99, 132, 0)",
            borderWidth: 2,
            type: "line",
            yAxisID: "y1",
            tension: 0.3,
            fill: false,
            order: 1,
            pointRadius: 4,
            pointBackgroundColor: "rgba(255, 99, 132, 1)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
          title: {
            display: true,
            text: chartTitle,
            font: {
              size: 14,
            },
          },
          tooltip: {
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
                    label += context.parsed.y;
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
            position: "left",
            title: {
              display: true,
              text: "Count",
            },
            beginAtZero: true,
          },
          y1: {
            type: "linear",
            position: "right",
            min: 0,
            max: 100,
            title: {
              display: true,
              text: "Cumulative %",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
      plugins: [
        {
          afterDatasetsDraw(chart) {
            const ctx = chart.ctx;
            chart.data.datasets[0].data.forEach((datapoint, index) => {
              const { x, y } = chart
                .getDatasetMeta(0)
                .data[index].getProps(["x", "y"]);
              ctx.font = "bold 12px Arial";
              ctx.textAlign = "center";
              ctx.textBaseline = "bottom";
              ctx.fillStyle = "#333";
              ctx.fillText(datapoint, x, y - 5);
            });
          },
        },
      ],
    });
  } catch (err) {
    chartCanvas.parentElement.innerHTML = `<div style='color:red'>Failed to load NCM Types chart: ${err.message}</div>`;
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  // Set up radio button change listeners for automatic chart updates
  const radioButtons = document.querySelectorAll('input[name="timePeriod"]');
  radioButtons.forEach((radio) => {
    radio.addEventListener("change", generateChart);
  });

  // Generate chart on page load (default to rolling 12 months)
  await generateChart();
});
