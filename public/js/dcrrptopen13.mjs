import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

window.addEventListener("DOMContentLoaded", async () => {
  const apiUrl = await getApiUrl();
  const chartCanvas = document.getElementById("openDCRChart");

  try {
    const response = await fetch(`${apiUrl}/requests/trend-open-13months`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP ${response.status}: ${errorData.error || "Unknown error"}`,
      );
    }

    const data = await response.json();

    if (!data.labels || !data.counts) {
      throw new Error(
        `Invalid data format: labels=${JSON.stringify(data.labels)}, counts=${JSON.stringify(data.counts)}`,
      );
    }

    // Create chart with dual Y-axes
    new Chart(chartCanvas, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Open Document Change Requests",
            data: data.counts,
            borderColor: "#000000",
            backgroundColor: "rgba(255, 107, 107, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: "#000000",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            yAxisID: "y",
          },
          {
            label: "Average Age (Days)",
            data: data.aging,
            borderColor: "#ff6b35",
            backgroundColor: "rgba(255, 107, 53, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: "#ff6b35",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            yAxisID: "y1",
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
            display: false,
          },
        },
        scales: {
          y: {
            type: "linear",
            position: "left",
            beginAtZero: true,
            title: {
              display: true,
              text: "Count of Open Document Change Requests",
            },
          },
          y1: {
            type: "linear",
            position: "right",
            beginAtZero: true,
            title: {
              display: true,
              text: "Average Age (Days)",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
          x: {
            title: {
              display: true,
              text: "Month",
            },
          },
        },
      },
    });
  } catch (error) {
    console.error("Error loading trend data:", error);
    chartCanvas.parentElement.innerHTML = `<p style="color: red; padding: 20px; background: #fee; border: 1px solid #f99; border-radius: 4px;">Error loading trend data: ${error.message}</p>`;
  }
});
