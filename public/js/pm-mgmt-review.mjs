import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

let chartInstance = null;

window.addEventListener("DOMContentLoaded", async () => {
  const apiUrl = await getApiUrl();

  // Get current date
  const today = new Date();
  const currentYear = today.getFullYear();

  // Elements
  const presetButtons = document.querySelectorAll(".preset-button");
  const selectedRangeDisplay = document.getElementById("selectedRange");
  const runReportBtn = document.getElementById("runReportBtn");
  const resetBtn = document.getElementById("resetBtn");
  const loadingContainer = document.getElementById("loadingContainer");
  const chartContainer = document.getElementById("chartContainer");

  // Get last calendar year (full year)
  function getLastCalendarYear() {
    const endDate = new Date(currentYear - 1, 11, 31);
    const startDate = new Date(currentYear - 1, 0, 1);
    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
      label: "Last Calendar Year",
    };
  }

  // Get last 12 months (rolling)
  function get12Months() {
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 11);
    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
      label: "Last 12 Months",
    };
  }

  function formatDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startStr = start.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const endStr = end.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return `${startStr} to ${endStr}`;
  }

  function updateSelectedRange(startDate, endDate, label) {
    if (startDate && endDate) {
      selectedRangeDisplay.textContent = `${label}: ${formatDateRange(startDate, endDate)}`;
    }
  }

  let currentPreset = null;
  let currentDates = null;

  function setPreset(preset) {
    let dates;
    if (preset === "lastYear") {
      dates = getLastCalendarYear();
    } else if (preset === "twelveMonths") {
      dates = get12Months();
    }

    currentPreset = preset;
    currentDates = dates;
    updateSelectedRange(dates.start, dates.end, dates.label);

    // Update active button state
    presetButtons.forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-preset="${preset}"]`).classList.add("active");
  }

  // Initialize with last calendar year
  setPreset("lastYear");

  // Preset button listeners
  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const preset = button.dataset.preset;
      setPreset(preset);
    });
  });

  // Run report
  runReportBtn.addEventListener("click", async () => {
    if (!currentDates) {
      alert("Please select a date range");
      return;
    }
    await loadReport(currentDates.start, currentDates.end);
  });

  // Reset
  resetBtn.addEventListener("click", () => {
    setPreset("lastYear");
    chartContainer.classList.remove("visible");
    selectedRangeDisplay.textContent = "";
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  });

  async function loadReport(startDate, endDate) {
    const chartCanvas = document.getElementById("pmTrendChart");

    try {
      loadingContainer.style.display = "block";
      chartContainer.classList.remove("visible");

      const response = await fetch(
        `${apiUrl}/input/pm-mgmt-review?startDate=${startDate}&endDate=${endDate}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP ${response.status}: ${errorData.error || "Unknown error"}`,
        );
      }

      const data = await response.json();

      console.log("API Response:", data);

      if (!data.labels || !data.expired || !data.no_entries) {
        console.error("Missing expected fields. Data:", data);
        throw new Error(
          `Invalid data format returned from API. Expected: labels, expired, no_entries. Got: ${JSON.stringify(Object.keys(data))}`,
        );
      }

      loadingContainer.style.display = "none";
      chartContainer.classList.add("visible");

      // Destroy previous chart if it exists
      if (chartInstance) {
        chartInstance.destroy();
      }

      // Create new chart
      chartInstance = new Chart(chartCanvas, {
        type: "line",
        data: {
          labels: data.labels,
          datasets: [
            {
              label: "Expired",
              data: data.expired,
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
              yAxisID: "y",
            },
            {
              label: "No Entries",
              data: data.no_entries,
              borderColor: "#4a90e2",
              backgroundColor: "rgba(74, 144, 226, 0.1)",
              borderWidth: 2,
              fill: false,
              tension: 0.4,
              pointRadius: 5,
              pointBackgroundColor: "#4a90e2",
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
                text: "Count of Expired",
              },
            },
            y1: {
              type: "linear",
              position: "right",
              beginAtZero: true,
              title: {
                display: true,
                text: "Count of No Entries",
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
      loadingContainer.style.display = "none";
      console.error("Error loading PM report:", error);
      chartContainer.classList.add("visible");
      chartContainer.innerHTML = `<p style="color: red; padding: 20px; background: #fee; border: 1px solid #f99; border-radius: 4px;">Error loading report: ${error.message}</p>`;
    }
  }
});
