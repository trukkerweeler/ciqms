import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

// Tank configuration - maps tank numbers to their subject codes
const TANK_CONFIG = {
  1: "01TE",
  3: "03TE",
  5: "05TE",
  7: "07TE",
  8: "08TE",
  11: "11TE",
  13: "13TE",
};

// Control limits for charts
const TEMP_LCL = 120;
const TEMP_UCL = 160;
const PERCENT_LCL = 10;
const PERCENT_UCL = 25;

// Detect tank number from the current page filename
function getTankNumber() {
  const pathname = window.location.pathname;
  const match = pathname.match(/tank(\d+)\.html/);
  if (match) {
    return parseInt(match[1]);
  }
  return 1;
}

// Get the tank number and subject
const tankNumber = getTankNumber();
const subject = TANK_CONFIG[tankNumber];

if (!subject) {
  console.error(`No configuration found for tank ${tankNumber}`);
}

window.addEventListener("DOMContentLoaded", async () => {
  const apiUrl = await getApiUrl();
  const tempCanvas = document.getElementById("temperatureChart");
  const percentCanvas = document.getElementById("percentChart");
  const infoPanel = document.getElementById("tank-info");
  const tempBanner = document.getElementById("tempStatusBanner");
  const percentBanner = document.getElementById("percentStatusBanner");

  try {
    // Fetch tank info
    const infoResponse = await fetch(
      `${apiUrl}/chem-tank/tank-info/${subject}`,
    );
    if (infoResponse.ok) {
      const info = await infoResponse.json();
      if (info.recordCount > 0) {
        const lastDate = new Date(info.lastEntry).toLocaleDateString();
        const firstDate = new Date(info.firstEntry).toLocaleDateString();
        infoPanel.textContent = `Records: ${info.recordCount} | First: ${firstDate} | Last: ${lastDate}`;
      } else {
        infoPanel.textContent = "No data available for this tank.";
      }
    }

    // Fetch trend data
    const response = await fetch(`${apiUrl}/chem-tank/trend-data/${subject}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP ${response.status}: ${errorData.error || "Unknown error"}`,
      );
    }

    const data = await response.json();

    if (!data.labels || data.labels.length === 0) {
      if (infoPanel.textContent === "") {
        infoPanel.textContent = "No data available for this tank.";
      }
      return;
    }

    // Analyze data to identify out of limit readings
    const tempOutOfLimit = data.fahrenheitData.map(
      (val) => val !== null && (val < TEMP_LCL || val > TEMP_UCL),
    );
    const percentOutOfLimit = data.percentData.map(
      (val) => val !== null && (val < PERCENT_LCL || val > PERCENT_UCL),
    );

    const tempOutCount = tempOutOfLimit.filter((x) => x).length;
    const percentOutCount = percentOutOfLimit.filter((x) => x).length;

    // Get latest non-null values (search backwards from end)
    let latestTemp = null;
    for (let i = data.fahrenheitData.length - 1; i >= 0; i--) {
      if (data.fahrenheitData[i] !== null) {
        latestTemp = data.fahrenheitData[i];
        break;
      }
    }

    let latestPercent = null;
    for (let i = data.percentData.length - 1; i >= 0; i--) {
      if (data.percentData[i] !== null) {
        latestPercent = data.percentData[i];
        break;
      }
    }

    // Update status banners
    updateStatusBanner(
      tempBanner,
      latestTemp,
      TEMP_LCL,
      TEMP_UCL,
      "°F",
      tempOutCount,
      data.labels.length,
    );
    updateStatusBanner(
      percentBanner,
      latestPercent,
      PERCENT_LCL,
      PERCENT_UCL,
      "%",
      percentOutCount,
      data.labels.length,
    );

    // Create TEMPERATURE chart with control limits and out-of-limit highlighting
    new Chart(tempCanvas, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Temperature (°F)",
            data: data.fahrenheitData.map((val, i) =>
              tempOutOfLimit[i] ? null : val,
            ),
            borderColor: "#000000",
            backgroundColor: "rgba(0, 0, 0, 0.05)",
            borderWidth: 2.5,
            fill: false,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: "#000000",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            spanGaps: true,
          },
          {
            label: "Out of Limits",
            data: data.fahrenheitData.map((val, i) =>
              tempOutOfLimit[i] ? val : null,
            ),
            borderColor: "#e74c3c",
            backgroundColor: "rgba(231, 76, 60, 0.2)",
            borderWidth: 2.5,
            fill: false,
            tension: 0.4,
            pointRadius: 7,
            pointBackgroundColor: "#e74c3c",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            spanGaps: true,
          },
          {
            label: "UCL (160°F)",
            data: Array(data.labels.length).fill(TEMP_UCL),
            borderColor: "#e74c3c",
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0,
          },
          {
            label: "LCL (120°F)",
            data: Array(data.labels.length).fill(TEMP_LCL),
            borderColor: "#e74c3c",
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0,
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
            beginAtZero: false,
            min: 110,
            max: 170,
            title: {
              display: true,
              text: "Temperature (°F)",
            },
          },
          x: {
            title: {
              display: true,
              text: "Date",
            },
          },
        },
      },
    });

    // Create PERCENT chart with control limits and out-of-limit highlighting
    new Chart(percentCanvas, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Concentration (%)",
            data: data.percentData.map((val, i) =>
              percentOutOfLimit[i] ? null : val,
            ),
            borderColor: "#1e88e5",
            backgroundColor: "rgba(30, 136, 229, 0.05)",
            borderWidth: 2.5,
            fill: false,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: "#1e88e5",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            spanGaps: true,
          },
          {
            label: "Out of Limits",
            data: data.percentData.map((val, i) =>
              percentOutOfLimit[i] ? val : null,
            ),
            borderColor: "#e74c3c",
            backgroundColor: "rgba(231, 76, 60, 0.2)",
            borderWidth: 2.5,
            fill: false,
            tension: 0.4,
            pointRadius: 7,
            pointBackgroundColor: "#e74c3c",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            spanGaps: true,
          },
          {
            label: "UCL (25%)",
            data: Array(data.labels.length).fill(PERCENT_UCL),
            borderColor: "#e74c3c",
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0,
          },
          {
            label: "LCL (10%)",
            data: Array(data.labels.length).fill(PERCENT_LCL),
            borderColor: "#e74c3c",
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0,
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
            beginAtZero: false,
            min: 5,
            max: 30,
            title: {
              display: true,
              text: "Concentration (%)",
            },
          },
          x: {
            title: {
              display: true,
              text: "Date",
            },
          },
        },
      },
    });
  } catch (err) {
    console.error("Error loading tank data:", err);
    infoPanel.textContent = `Error: ${err.message}`;
  }
});

// Helper function to update status banners with color-coded status
function updateStatusBanner(
  bannerElement,
  latestValue,
  lcl,
  ucl,
  unit,
  outCount,
  totalCount,
) {
  if (!bannerElement) return;

  let status = "N/A";
  let isInLimit = false;

  if (latestValue === null) {
    status = "NO DATA";
    bannerElement.style.backgroundColor = "#95a5a6";
    bannerElement.style.color = "#fff";
  } else if (latestValue < lcl || latestValue > ucl) {
    status = `OUT OF LIMITS ⚠`;
    isInLimit = false;
    bannerElement.style.backgroundColor = "#e74c3c";
    bannerElement.style.color = "#fff";
  } else {
    status = "IN LIMITS ✓";
    isInLimit = true;
    bannerElement.style.backgroundColor = "#27ae60";
    bannerElement.style.color = "#fff";
  }

  const message =
    latestValue !== null
      ? `Latest: ${latestValue}${unit} (${lcl}-${ucl}${unit}) | ${status} | ${outCount}/${totalCount} readings out of limits`
      : `${status}`;

  bannerElement.textContent = message;
}
