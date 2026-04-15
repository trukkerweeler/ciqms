import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

// Centralized tank configuration - eliminates all conditional logic
const TANK_CONFIG = {
  1: {
    code: "01TE",
    charts: [
      {
        name: "Temperature",
        unit: "°F",
        dataField: "fahrenheitData",
        lcl: 120,
        ucl: 160,
        min: 110,
        max: 170,
        color: "#000000",
      },
      {
        name: "Concentration",
        unit: "%",
        dataField: "percentData",
        lcl: 10,
        ucl: 25,
        min: 5,
        max: 30,
        color: "#1e88e5",
      },
    ],
  },
  3: {
    code: "03TE",
    charts: [
      {
        name: "Temperature",
        unit: "°F",
        dataField: "fahrenheitData",
        lcl: 60,
        ucl: 95,
        min: 55,
        max: 105,
        color: "#000000",
      },
    ],
  },
  5: {
    code: "05TE",
    charts: [
      {
        name: "Temperature",
        unit: "°F",
        dataField: "fahrenheitData",
        lcl: 60,
        ucl: 95,
        min: 55,
        max: 105,
        color: "#000000",
      },
    ],
  },
  7: {
    code: "07TE",
    charts: [
      {
        name: "Temperature",
        unit: "°F",
        dataField: "fahrenheitData",
        lcl: 70,
        ucl: 90,
        min: 65,
        max: 95,
        color: "#000000",
      },
    ],
  },
  8: {
    code: "08TE",
    charts: [
      {
        name: "Fahrenheit",
        unit: "°F",
        dataField: "fahrenheitData",
        lcl: 60,
        ucl: 110,
        min: 50,
        max: 120,
        color: "#000000",
      },
      {
        name: "pH",
        unit: "pH",
        dataField: "phData",
        lcl: 1.5,
        ucl: 2.1,
        min: 1,
        max: 2.5,
        color: "#27ae60",
      },
    ],
  },
  11: {
    code: "11PH",
    charts: [
      {
        name: "pH",
        unit: "pH",
        dataField: "phData",
        lcl: 3.6,
        ucl: 4.0,
        min: 3.0,
        max: 4.5,
        color: "#27ae60",
      },
    ],
  },
  13: {
    code: "13TE",
    charts: [
      {
        name: "pH",
        unit: "pH",
        dataField: "phData",
        lcl: 1.8,
        ucl: 2.2,
        min: 1.5,
        max: 2.5,
        color: "#27ae60",
      },
    ],
  },
  Q: {
    codes: ["QTPH", "QTPC"],
    charts: [
      {
        name: "pH",
        unit: "pH",
        dataField: "phData",
        lcl: 7.5,
        ucl: 9.2,
        min: 7.0,
        max: 9.5,
        color: "#27ae60",
      },
      {
        name: "Time",
        unit: "Seconds",
        dataField: "secondsData",
        lcl: 15,
        ucl: 18,
        min: 14,
        max: 19,
        color: "#e74c3c",
      },
    ],
  },
};

// Detect tank number or letter from the current page filename
function getTankNumber() {
  const pathname = window.location.pathname;
  // Try matching tankQ.html first
  if (pathname.includes("tankQ.html")) {
    return "Q";
  }
  // Then try matching tank1.html, tank3.html, etc.
  const match = pathname.match(/tank(\d+)\.html/);
  if (match) {
    return parseInt(match[1]);
  }
  return 1;
}

// Get the tank number and configuration
const tankNumber = getTankNumber();
const tankConfig = TANK_CONFIG[tankNumber];

if (!tankConfig) {
  console.error(`No configuration found for tank ${tankNumber}`);
}

window.addEventListener("DOMContentLoaded", async () => {
  const apiUrl = await getApiUrl();
  const infoPanel = document.getElementById("tank-info");

  try {
    // Fetch tank info - use first code if multiple codes exist
    const infoCode = Array.isArray(tankConfig.codes)
      ? tankConfig.codes[0]
      : tankConfig.code;
    const infoResponse = await fetch(
      `${apiUrl}/chem-tank/tank-info/${infoCode}`,
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

    // Fetch trend data - handle both single code and multiple codes
    let trendUrl;
    if (Array.isArray(tankConfig.codes)) {
      // For Tank Q with multiple codes, fetch all at once
      trendUrl = `${apiUrl}/chem-tank/trend-data-multi/${tankConfig.codes.join(",")}`;
    } else {
      // For other tanks with single code
      trendUrl = `${apiUrl}/chem-tank/trend-data/${tankConfig.code}`;
    }

    const response = await fetch(trendUrl);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `HTTP ${response.status}: ${errorData.error || "Unknown error"}`,
      );
    }

    const data = await response.json();

    // console.log("API Response from trend-data:", {
    //   hasLabels: !!data.labels,
    //   labelsLength: data.labels?.length,
    //   hasPercentData: !!data.percentData,
    //   hasFahrenheitData: !!data.fahrenheitData,
    //   hasPhData: !!data.phData,
    //   hasSecondsData: !!data.secondsData,
    //   allKeys: Object.keys(data),
    //   samplePhData: data.phData?.slice(0, 3),
    //   sampleSecondsData: data.secondsData?.slice(0, 3),
    // });

    if (!data.labels || data.labels.length === 0) {
      if (infoPanel.textContent === "") {
        infoPanel.textContent = "No data available for this tank.";
      }
      return;
    }

    // Render charts for each tank configuration
    tankConfig.charts.forEach((chartConfig, chartIndex) => {
      const canvasId = chartIndex === 0 ? "temperatureChart" : "percentChart";
      const bannerId =
        chartIndex === 0 ? "tempStatusBanner" : "percentStatusBanner";
      const canvas = document.getElementById(canvasId);
      const banner = document.getElementById(bannerId);

      if (!canvas) {
        console.warn(`Canvas ${canvasId} not found`);
        return;
      }

      // Get data for this chart
      const chartDataField = data[chartConfig.dataField];
      if (!chartDataField) {
        console.warn(`Data field ${chartConfig.dataField} not found`);
        return;
      }

      // Debug logging
      //   console.log(`Chart ${chartIndex} (${chartConfig.name}):`, {
      //     dataField: chartConfig.dataField,
      //     dataLength: chartDataField.length,
      //     nonNullCount: chartDataField.filter((v) => v !== null).length,
      //     sampleData: chartDataField.slice(0, 3),
      //     min: chartConfig.min,
      //     max: chartConfig.max,
      //   });

      // Identify out of limit readings
      const outOfLimit = chartDataField.map(
        (val) =>
          val !== null && (val < chartConfig.lcl || val > chartConfig.ucl),
      );
      const outCount = outOfLimit.filter((x) => x).length;

      // Get latest non-null value
      let latestValue = null;
      for (let i = chartDataField.length - 1; i >= 0; i--) {
        if (chartDataField[i] !== null) {
          latestValue = chartDataField[i];
          break;
        }
      }

      // Update status banner
      updateStatusBanner(
        banner,
        latestValue,
        chartConfig.lcl,
        chartConfig.ucl,
        chartConfig.unit,
        outCount,
        chartDataField.filter((v) => v !== null).length,
      );

      // Create chart
      new Chart(canvas, {
        type: "line",
        data: {
          labels: data.labels,
          datasets: [
            {
              label: chartConfig.name,
              data: chartDataField.map((val, i) =>
                outOfLimit[i] ? null : val,
              ),
              borderColor: chartConfig.color,
              backgroundColor:
                "rgba(" + hexToRgb(chartConfig.color).join(",") + ", 0.05)",
              borderWidth: 2.5,
              fill: false,
              tension: 0.4,
              pointRadius: 5,
              pointBackgroundColor: chartConfig.color,
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointHoverRadius: 7,
              spanGaps: true,
            },
            {
              label: "Out of Limits",
              data: chartDataField.map((val, i) =>
                outOfLimit[i] ? val : null,
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
              label: `UCL (${chartConfig.ucl}${chartConfig.unit})`,
              data: Array(data.labels.length).fill(chartConfig.ucl),
              borderColor: "#e74c3c",
              borderWidth: 2,
              borderDash: [5, 5],
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 0,
              tension: 0,
            },
            {
              label: `LCL (${chartConfig.lcl}${chartConfig.unit})`,
              data: Array(data.labels.length).fill(chartConfig.lcl),
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
              position: "left",
              beginAtZero: false,
              min: chartConfig.min,
              max: chartConfig.max,
              title: {
                display: true,
                text: `${chartConfig.name} (${chartConfig.unit})`,
                font: { size: 12, weight: "bold" },
              },
              ticks: {
                stepSize:
                  chartConfig.max - chartConfig.min < 5
                    ? (chartConfig.max - chartConfig.min) / 4
                    : undefined,
                callback: function (value) {
                  return value.toFixed(2);
                },
              },
              grid: {
                display: true,
                drawBorder: true,
              },
            },
            x: {
              title: {
                display: true,
                text: "Date",
              },
              grid: {
                display: true,
              },
            },
          },
        },
      });
    });
  } catch (err) {
    console.error("Error loading tank data:", err);
    infoPanel.textContent = `Error: ${err.message}`;
  }
});

// Helper to convert hex color to RGB for rgba
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

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
