import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

let ageChartInstance = null;
let yoyChartInstance = null;

window.addEventListener("DOMContentLoaded", async () => {
  try {
    // Load both datasets
    await Promise.all([loadAgeAtClosureData(), loadYoYFindingsData()]);
  } catch (error) {
    console.error("Error loading report data:", error);
  }
});

async function loadAgeAtClosureData() {
  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}/ia-report/age-at-closure`);

    if (!response.ok) {
      console.error("Error loading age at closure data");
      return;
    }

    const daysArray = await response.json();
    renderAgeAtClosureChart(daysArray);
  } catch (error) {
    console.error("Error fetching age at closure data:", error);
  }
}

async function loadYoYFindingsData() {
  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}/ia-report/yoy-findings`);

    if (!response.ok) {
      console.error("Error loading YoY findings data");
      return;
    }

    const yoyData = await response.json();
    renderYoYFindingsChart(yoyData);
  } catch (error) {
    console.error("Error fetching YoY findings data:", error);
  }
}

function renderAgeAtClosureChart(daysArray) {
  const chartCanvas = document.getElementById("ageAtClosureChart");

  // Destroy existing chart if it exists
  if (ageChartInstance) {
    ageChartInstance.destroy();
  }

  // Create histogram data - bin the days into groups
  const bins = createHistogramBins(daysArray);
  const labels = bins.map((b) => `${b.min}-${b.max}`);
  const data = bins.map((b) => b.count);

  ageChartInstance = new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Number of Audits",
          data: data,
          backgroundColor: "#4CAF50",
          borderColor: "#2E7D32",
          borderWidth: 1,
          borderRadius: 4,
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
          text: "IA Age at Closure (Days between Scheduled and Completion Date)",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Count of Audits",
          },
        },
        x: {
          title: {
            display: true,
            text: "Days to Closure",
          },
        },
      },
    },
  });
}

function renderYoYFindingsChart(yoyData) {
  const chartCanvas = document.getElementById("yoyFindingsChart");

  // Destroy existing chart if it exists
  if (yoyChartInstance) {
    yoyChartInstance.destroy();
  }

  // Extract years and create datasets for each finding type
  const years = yoyData.map((d) => d.year.toString());
  const carData = yoyData.map((d) => d.CAR || 0);
  const ofiData = yoyData.map((d) => d.OFI || 0);
  const dcrData = yoyData.map((d) => d.DCR || 0);

  yoyChartInstance = new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels: years,
      datasets: [
        {
          label: "CAR (Corrective Action Request)",
          data: carData,
          backgroundColor: "#FF6B6B",
          borderColor: "#C92A2A",
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: "OFI (Opportunity For Improvement)",
          data: ofiData,
          backgroundColor: "#4ECDC4",
          borderColor: "#1D8A8A",
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: "DCR (Design Change Request)",
          data: dcrData,
          backgroundColor: "#FFD93D",
          borderColor: "#F5A623",
          borderWidth: 1,
          borderRadius: 4,
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
          text: "Internal Audit Findings - Year over Year (Previous 2 Calendar Years)",
        },
      },
      scales: {
        x: {
          stacked: false,
          title: {
            display: true,
            text: "Year",
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Count of Findings",
          },
        },
      },
    },
  });
}

// Helper function to create histogram bins
function createHistogramBins(daysArray) {
  if (!daysArray || daysArray.length === 0) {
    return [];
  }

  // Determine bin size (10 day bins works well for audit closure times)
  const binSize = 10;
  const minDays = Math.min(...daysArray);
  const maxDays = Math.max(...daysArray);

  // Create bins
  const bins = [];
  for (
    let i = Math.floor(minDays / binSize) * binSize;
    i <= maxDays;
    i += binSize
  ) {
    bins.push({
      min: i,
      max: i + binSize - 1,
      count: 0,
    });
  }

  // Count days into bins
  daysArray.forEach((days) => {
    for (let bin of bins) {
      if (days >= bin.min && days <= bin.max) {
        bin.count++;
        break;
      }
    }
  });

  // Remove empty bins from the ends
  while (bins.length > 0 && bins[0].count === 0) {
    bins.shift();
  }
  while (bins.length > 0 && bins[bins.length - 1].count === 0) {
    bins.pop();
  }

  return bins;
}
