import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

let yoyChartInstance = null;

window.addEventListener("DOMContentLoaded", async () => {
  // Initial load
  loadYoYData();

  async function loadYoYData() {
    try {
      const apiUrl = await getApiUrl();
      const response = await fetch(`${apiUrl}/attendance/yoy-data`);

      if (!response.ok) {
        console.error("Error loading YoY data");
        return;
      }

      const data = await response.json();
      renderYoYChart(data);
    } catch (error) {
      console.error("Error fetching YoY data:", error);
    }
  }

  function renderYoYChart(data) {
    const chartCanvas = document.getElementById("yoyChart");

    // Destroy existing chart if it exists
    if (yoyChartInstance) {
      yoyChartInstance.destroy();
    }

    // Extract years and create dual datasets
    const years = data.map((d) => d.year.toString());
    const counts = data.map((d) => Math.round(d.count || 0));
    const minutes = data.map((d) => Math.round(d.total_minutes || 0));

    yoyChartInstance = new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels: years,
        datasets: [
          {
            label: "Attendance Records",
            data: counts,
            borderColor: "#0066cc",
            backgroundColor: "#0066cc",
            borderWidth: 2,
            borderRadius: 4,
            yAxisID: "y",
          },
          {
            label: "Training Minutes",
            data: minutes,
            borderColor: "#ff6b35",
            backgroundColor: "#ff6b35",
            borderWidth: 2,
            borderRadius: 4,
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
            display: true,
            text: "CTA Attendance 5-Year Trend",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            type: "linear",
            position: "left",
            title: {
              display: true,
              text: "Attendance Records",
            },
          },
          y1: {
            beginAtZero: true,
            type: "linear",
            position: "right",
            title: {
              display: true,
              text: "Training Minutes",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
          x: {
            title: {
              display: true,
              text: "Year",
            },
          },
        },
      },
    });
  }
});
