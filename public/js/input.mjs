import {
  loadHeaderFooter,
  createNotesSection,
  getSessionUser,
  getDateTime,
  myport,
  createElement,
  formatDate,
  getUrlParam,
  extractText,
  timestampText,
  getApiUrl,
} from "./utils.mjs";
import {
  calculateDaysOverdue,
  createEscalationButton,
  createEscalationHistory,
} from "./escalation-utils.mjs";
import userEmails from "./users.mjs";

loadHeaderFooter();

const port = myport();
const user = await getSessionUser();
const iid = getUrlParam("id");

const apiUrl = await getApiUrl();

// Replace all hardcoded URLs with dynamic apiUrl
const apiUrls = {
  input: `${apiUrl}/input/`,
  csr: `${apiUrl}/csr/`,
  ssr: `${apiUrl}/ssr/`,
  acert: `${apiUrl}/acert/`,
};

// Store current record subject for context
let currentSubject = "";

// Helper function to show timed notification banner
function showNotification(message, duration = 3000) {
  const banner = document.createElement("div");
  banner.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #4caf50;
    color: white;
    padding: 16px 24px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    font-size: 14px;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  banner.textContent = message;
  document.body.appendChild(banner);

  // Add keyframe animation
  if (!document.querySelector("style[data-notification]")) {
    const style = document.createElement("style");
    style.setAttribute("data-notification", "true");
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    banner.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => banner.remove(), 300);
  }, duration);
}

// Validation helper for username fields (ending with _BY or _TO)
function validateUsernameField(fieldName, fieldValue) {
  const fieldDisplayName = fieldName.replace(/-/g, " ").toLowerCase();

  // Check for spaces
  if (fieldValue.includes(" ")) {
    return {
      isValid: false,
      message: `❌ "${fieldDisplayName}"\n\nSpaces are not allowed in username fields.\n\nFormat: First initial + Last name\nExample: TKENT (T=first initial, KENT=last name)`,
    };
  }

  // Check if field is empty
  if (!fieldValue.trim()) {
    return {
      isValid: false,
      message: `❌ "${fieldDisplayName}" is required and cannot be empty.`,
    };
  }

  return { isValid: true };
}

// Validation helper for code fields (Subject, Type, etc.)
function validateCodeField(fieldName, fieldValue) {
  const fieldDisplayName = fieldName.replace(/-/g, " ").toLowerCase();

  // Check for spaces
  if (fieldValue.includes(" ")) {
    return {
      isValid: false,
      message: `❌ "${fieldDisplayName}"\n\nSpaces are not allowed in code fields.\n\nPlease check the help file or ask your manager for valid code values.`,
    };
  }

  return { isValid: true };
}

// Wire up cancel button for collect data dialog
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "cancelCollData") {
    const dlg = document.getElementById("collectDataDialog");
    if (dlg) dlg.close();
  }
  if (e.target && e.target.id === "cancelCollData01TE") {
    const dlg = document.getElementById("collectDataDialog01TE");
    if (dlg) dlg.close();
  }
  if (e.target && e.target.id === "cancelCollData03TE") {
    const dlg = document.getElementById("collectDataDialog03TE");
    if (dlg) dlg.close();
  }
  if (e.target && e.target.id === "cancelCollData05TE") {
    const dlg = document.getElementById("collectDataDialog05TE");
    if (dlg) dlg.close();
  }
  if (e.target && e.target.id === "cancelCollData07TE") {
    const dlg = document.getElementById("collectDataDialog07TE");
    if (dlg) dlg.close();
  }
  if (e.target && e.target.id === "cancelCollData08TE") {
    const dlg = document.getElementById("collectDataDialog08TE");
    if (dlg) dlg.close();
  }
  if (e.target && e.target.id === "cancelCollData11PH") {
    const dlg = document.getElementById("collectDataDialog11PH");
    if (dlg) dlg.close();
  }
  if (e.target && e.target.id === "cancelCollData13TE") {
    const dlg = document.getElementById("collectDataDialog13TE");
    if (dlg) dlg.close();
  }
  if (e.target && e.target.id === "cancelCollDataQTPH") {
    const dlg = document.getElementById("collectDataDialogQTPH");
    if (dlg) dlg.close();
  }
  if (e.target && e.target.id === "cancelCollDataQTPC") {
    const dlg = document.getElementById("collectDataDialogQTPC");
    if (dlg) dlg.close();
  }
});
// Handle save for collect data dialog and POST to /csr/:iid
document.addEventListener("submit", async (e) => {
  if (e.target && e.target.id === "collectForm") {
    e.preventDefault();
    const dlg = document.getElementById("collectDataDialog");
    const form = e.target;
    try {
      // Fetch next COLLECT_ID from backend
      const nextIdRes = await fetch(`${apiUrls.csr}nextCSRId`);
      if (!nextIdRes.ok) throw new Error("Failed to get next COLLECT_ID");
      const nextCollectId = await nextIdRes.json();
      const data = {
        COLLECT_ID: nextCollectId,
        CUSTOMER_ID: form.CUSTOMER_ID.value.toUpperCase(),
        UNIT: form.UNIT.value.toUpperCase(),
        VALUE: form.VALUE.value,
        SAMPLE_DATE: form.SAMPLE_DATE.value,
        INPUT_USER: (await getSessionUser()) || "",
      };
      const url = `${apiUrls.csr}${iid}`;
      const body = {};
      body["data"] = data;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save data");
      if (dlg) dlg.close();
      showNotification("Data saved successfully");
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  }

  // Handle save for 07TE collect data dialog
  if (e.target && e.target.id === "collectForm07TE") {
    e.preventDefault();
    const dlg = document.getElementById("collectDataDialog07TE");
    const form = e.target;
    try {
      const fahrenheit = form.FAHRENHEIT_VALUE_07TE.value.trim();

      // Require Fahrenheit value
      if (!fahrenheit) {
        alert("Please enter a Fahrenheit value");
        return;
      }

      const data = {
        INPUT_ID: iid,
        FAHRENHEIT: fahrenheit || null,
      };
      const url = `${apiUrls.input}collect/${iid}`;
      const body = {};
      body["data"] = data;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save data");
      if (dlg) dlg.close();
      showNotification("Data saved successfully");
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  }

  // Handle save for 13TE collect data dialog
  if (e.target && e.target.id === "collectForm13TE") {
    e.preventDefault();
    const dlg = document.getElementById("collectDataDialog13TE");
    const form = e.target;
    try {
      const ph = form.PH_VALUE_13TE.value.trim();

      // Require pH value
      if (!ph) {
        alert("Please enter a pH value");
        return;
      }

      const data = {
        INPUT_ID: iid,
        PH: ph || null,
      };
      const url = `${apiUrls.input}collect/${iid}`;
      const body = {};
      body["data"] = data;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save data");
      if (dlg) dlg.close();
      showNotification("Data saved successfully");
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  }

  // Handle save for 08TE collect data dialog
  if (e.target && e.target.id === "collectForm08TE") {
    e.preventDefault();
    const dlg = document.getElementById("collectDataDialog08TE");
    const form = e.target;
    try {
      const ph = form.PH_VALUE.value.trim();
      const fahrenheit = form.FAHRENHEIT_VALUE_08TE.value.trim();

      // Require at least one value
      if (!ph && !fahrenheit) {
        alert("Please enter either a pH or Fahrenheit value");
        return;
      }

      const data = {
        INPUT_ID: iid,
        PH: ph || null,
        FAHRENHEIT: fahrenheit || null,
      };
      const url = `${apiUrls.input}collect/${iid}`;
      const body = {};
      body["data"] = data;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save data");
      if (dlg) dlg.close();
      showNotification("Data saved successfully");
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  }

  // Handle save for 11PH collect data dialog
  if (e.target && e.target.id === "collectForm11PH") {
    e.preventDefault();
    const dlg = document.getElementById("collectDataDialog11PH");
    const form = e.target;
    try {
      const ph = form.PH_VALUE_11PH.value.trim();

      // Require pH value
      if (!ph) {
        alert("Please enter a pH value");
        return;
      }

      const data = {
        INPUT_ID: iid,
        PH: ph || null,
      };
      const url = `${apiUrls.input}collect/${iid}`;
      const body = {};
      body["data"] = data;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save data");
      if (dlg) dlg.close();
      showNotification("Data saved successfully");
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  }

  // Handle save for QTPH collect data dialog
  if (e.target && e.target.id === "collectFormQTPH") {
    e.preventDefault();
    const dlg = document.getElementById("collectDataDialogQTPH");
    const form = e.target;
    try {
      const ph = form.PH_VALUE_QTPH.value.trim();

      // Require pH value
      if (!ph) {
        alert("Please enter a pH value");
        return;
      }

      const data = {
        INPUT_ID: iid,
        PH: ph || null,
      };
      const url = `${apiUrls.input}collect/${iid}`;
      const body = {};
      body["data"] = data;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save data");
      if (dlg) dlg.close();
      showNotification("Data saved successfully");
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  }

  // Handle save for QTPC collect data dialog
  if (e.target && e.target.id === "collectFormQTPC") {
    e.preventDefault();
    const dlg = document.getElementById("collectDataDialogQTPC");
    const form = e.target;
    try {
      const seconds = form.SECONDS_VALUE_QTPC.value.trim();

      // Require seconds value
      if (!seconds) {
        alert("Please enter a time value in seconds");
        return;
      }

      const data = {
        INPUT_ID: iid,
        SECONDS: seconds || null,
      };
      const url = `${apiUrls.input}collect/${iid}`;
      const body = {};
      body["data"] = data;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save data");
      if (dlg) dlg.close();
      showNotification("Data saved successfully");
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  }

  // Handle save for 01TE collect data dialog
  if (e.target && e.target.id === "collectForm01TE") {
    e.preventDefault();
    const dlg = document.getElementById("collectDataDialog01TE");
    const form = e.target;
    try {
      const percent = form.PERCENT_VALUE.value.trim();
      const fahrenheit = form.FAHRENHEIT_VALUE.value.trim();

      // Require at least one value
      if (!percent && !fahrenheit) {
        alert("Please enter either a Percent or Fahrenheit value");
        return;
      }

      const data = {
        INPUT_ID: iid,
        PERCENT: percent || null,
        FAHRENHEIT: fahrenheit || null,
      };
      const url = `${apiUrls.input}collect/${iid}`;
      const body = {};
      body["data"] = data;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save data");
      if (dlg) dlg.close();
      showNotification("Data saved successfully");
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  }

  // Handle save for 05TE collect data dialog
  if (e.target && e.target.id === "collectForm05TE") {
    e.preventDefault();
    const dlg = document.getElementById("collectDataDialog05TE");
    const form = e.target;
    try {
      const fahrenheit = form.FAHRENHEIT_VALUE_05TE.value.trim();

      // Require Fahrenheit value
      if (!fahrenheit) {
        alert("Please enter a Fahrenheit value");
        return;
      }

      const data = {
        INPUT_ID: iid,
        FAHRENHEIT: fahrenheit || null,
      };
      const url = `${apiUrls.input}collect/${iid}`;
      const body = {};
      body["data"] = data;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save data");
      if (dlg) dlg.close();
      showNotification("Data saved successfully");
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  }

  // Handle save for 03TE collect data dialog
  if (e.target && e.target.id === "collectForm03TE") {
    e.preventDefault();
    const dlg = document.getElementById("collectDataDialog03TE");
    const form = e.target;
    try {
      const fahrenheit = form.FAHRENHEIT_VALUE_03TE.value.trim();

      // Require Fahrenheit value
      if (!fahrenheit) {
        alert("Please enter a Fahrenheit value");
        return;
      }

      const data = {
        INPUT_ID: iid,
        FAHRENHEIT: fahrenheit || null,
      };
      const url = `${apiUrls.input}collect/${iid}`;
      const body = {};
      body["data"] = data;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save data");
      if (dlg) dlg.close();
      showNotification("Data saved successfully");
    } catch (err) {
      alert("Error saving data: " + err.message);
    }
  }
});
// Show collect data dialog when Collect button is clicked
document.addEventListener("click", async (e) => {
  if (e.target && e.target.id === "btnCollData") {
    e.preventDefault();

    // Show appropriate dialog based on subject
    if (currentSubject === "01TE") {
      const dlg = document.getElementById("collectDataDialog01TE");
      if (dlg) {
        // Fetch and display existing temperature data
        const tempData = await fetch01TETemperatureData(iid);
        const dataDisplayDiv = document.getElementById(
          "collectDataDisplay01TE",
        );
        if (dataDisplayDiv) {
          // Clear existing display
          dataDisplayDiv.innerHTML = "";

          if (tempData && (tempData.percent || tempData.fahrenheit)) {
            const dataContainer = document.createElement("div");
            dataContainer.style.padding = "10px";
            dataContainer.style.backgroundColor = "#f5f5f5";
            dataContainer.style.borderRadius = "4px";
            dataContainer.style.marginBottom = "10px";

            const title = document.createElement("strong");
            title.textContent = "Previously Collected Data:";
            dataContainer.appendChild(title);

            if (tempData.percent) {
              const percentP = document.createElement("p");
              percentP.style.margin = "5px 0";
              percentP.textContent = `Percent: ${tempData.percent}`;
              dataContainer.appendChild(percentP);
            }

            if (tempData.fahrenheit) {
              const fahrenheitP = document.createElement("p");
              fahrenheitP.style.margin = "5px 0";
              fahrenheitP.textContent = `Fahrenheit: ${tempData.fahrenheit}`;
              dataContainer.appendChild(fahrenheitP);
            }

            dataDisplayDiv.appendChild(dataContainer);
          }
        }

        dlg.showModal();
      }
    } else if (currentSubject === "03TE") {
      const dlg = document.getElementById("collectDataDialog03TE");
      if (dlg) {
        // Fetch and display existing temperature data
        const tempData = await fetch03TETemperatureData(iid);
        const dataDisplayDiv = document.getElementById(
          "collectDataDisplay03TE",
        );
        if (dataDisplayDiv) {
          // Clear existing display
          dataDisplayDiv.innerHTML = "";

          if (tempData && tempData.fahrenheit) {
            const dataContainer = document.createElement("div");
            dataContainer.style.padding = "10px";
            dataContainer.style.backgroundColor = "#f5f5f5";
            dataContainer.style.borderRadius = "4px";
            dataContainer.style.marginBottom = "10px";

            const title = document.createElement("strong");
            title.textContent = "Previously Collected Data:";
            dataContainer.appendChild(title);

            if (tempData.fahrenheit) {
              const fahrenheitP = document.createElement("p");
              fahrenheitP.style.margin = "5px 0";
              fahrenheitP.textContent = `Fahrenheit: ${tempData.fahrenheit}`;
              dataContainer.appendChild(fahrenheitP);
            }

            dataDisplayDiv.appendChild(dataContainer);
          }
        }

        dlg.showModal();
      }
    } else if (currentSubject === "05TE") {
      const dlg = document.getElementById("collectDataDialog05TE");
      if (dlg) {
        // Fetch and display existing temperature data
        const tempData = await fetch05TETemperatureData(iid);
        const dataDisplayDiv = document.getElementById(
          "collectDataDisplay05TE",
        );
        if (dataDisplayDiv) {
          // Clear existing display
          dataDisplayDiv.innerHTML = "";

          if (tempData && tempData.fahrenheit) {
            const dataContainer = document.createElement("div");
            dataContainer.style.padding = "10px";
            dataContainer.style.backgroundColor = "#f5f5f5";
            dataContainer.style.borderRadius = "4px";
            dataContainer.style.marginBottom = "10px";

            const title = document.createElement("strong");
            title.textContent = "Previously Collected Data:";
            dataContainer.appendChild(title);

            if (tempData.fahrenheit) {
              const fahrenheitP = document.createElement("p");
              fahrenheitP.style.margin = "5px 0";
              fahrenheitP.textContent = `Fahrenheit: ${tempData.fahrenheit}`;
              dataContainer.appendChild(fahrenheitP);
            }

            dataDisplayDiv.appendChild(dataContainer);
          }
        }

        dlg.showModal();
      }
    } else if (currentSubject === "07TE") {
      const dlg = document.getElementById("collectDataDialog07TE");
      if (dlg) {
        // Fetch and display existing temperature data
        const tempData = await fetch07TETemperatureData(iid);
        const dataDisplayDiv = document.getElementById(
          "collectDataDisplay07TE",
        );
        if (dataDisplayDiv) {
          // Clear existing display
          dataDisplayDiv.innerHTML = "";

          if (tempData && tempData.fahrenheit) {
            const dataContainer = document.createElement("div");
            dataContainer.style.padding = "10px";
            dataContainer.style.backgroundColor = "#f5f5f5";
            dataContainer.style.borderRadius = "4px";
            dataContainer.style.marginBottom = "10px";

            const title = document.createElement("strong");
            title.textContent = "Previously Collected Data:";
            dataContainer.appendChild(title);

            if (tempData.fahrenheit) {
              const fahrenheitItem = document.createElement("div");
              fahrenheitItem.textContent = `Fahrenheit: ${tempData.fahrenheit}°F`;
              fahrenheitItem.style.marginTop = "5px";
              dataContainer.appendChild(fahrenheitItem);
            }

            dataDisplayDiv.appendChild(dataContainer);
          }
        }

        dlg.showModal();
      }
    } else if (currentSubject === "08TE") {
      const dlg = document.getElementById("collectDataDialog08TE");
      if (dlg) {
        // Fetch and display existing pH and temperature data
        const tempData = await fetch08TETemperatureData(iid);
        const dataDisplayDiv = document.getElementById(
          "collectDataDisplay08TE",
        );
        if (dataDisplayDiv) {
          // Clear existing display
          dataDisplayDiv.innerHTML = "";

          if (tempData && (tempData.PH || tempData.fahrenheit)) {
            const dataContainer = document.createElement("div");
            dataContainer.style.padding = "10px";
            dataContainer.style.backgroundColor = "#f5f5f5";
            dataContainer.style.borderRadius = "4px";
            dataContainer.style.marginBottom = "10px";

            const title = document.createElement("strong");
            title.textContent = "Previously Collected Data:";
            dataContainer.appendChild(title);

            if (tempData.PH) {
              const phP = document.createElement("p");
              phP.style.margin = "5px 0";
              phP.textContent = `pH: ${tempData.PH}`;
              dataContainer.appendChild(phP);
            }

            if (tempData.fahrenheit) {
              const fahrenheitP = document.createElement("p");
              fahrenheitP.style.margin = "5px 0";
              fahrenheitP.textContent = `Fahrenheit: ${tempData.fahrenheit}`;
              dataContainer.appendChild(fahrenheitP);
            }

            dataDisplayDiv.appendChild(dataContainer);
          }
        }

        dlg.showModal();
      }
    } else if (currentSubject === "11PH") {
      const dlg = document.getElementById("collectDataDialog11PH");
      if (dlg) {
        // Fetch and display existing pH data
        const tempData = await fetch11PHData(iid);
        const dataDisplayDiv = document.getElementById(
          "collectDataDisplay11PH",
        );
        if (dataDisplayDiv) {
          // Clear existing display
          dataDisplayDiv.innerHTML = "";

          if (tempData && tempData.ph) {
            const dataContainer = document.createElement("div");
            dataContainer.style.padding = "10px";
            dataContainer.style.backgroundColor = "#f5f5f5";
            dataContainer.style.borderRadius = "4px";
            dataContainer.style.marginBottom = "10px";

            const title = document.createElement("strong");
            title.textContent = "Previously Collected Data:";
            dataContainer.appendChild(title);

            if (tempData.ph) {
              const phP = document.createElement("p");
              phP.style.margin = "5px 0";
              phP.textContent = `pH: ${tempData.ph}`;
              dataContainer.appendChild(phP);
            }

            dataDisplayDiv.appendChild(dataContainer);
          }
        }

        dlg.showModal();
      }
    } else if (currentSubject === "13TE") {
      const dlg = document.getElementById("collectDataDialog13TE");
      if (dlg) {
        // Fetch and display existing pH data
        const phData = await fetch13TEpHData(iid);
        const dataDisplayDiv = document.getElementById(
          "collectDataDisplay13TE",
        );
        if (dataDisplayDiv) {
          // Clear existing display
          dataDisplayDiv.innerHTML = "";

          if (phData && phData.ph) {
            const dataContainer = document.createElement("div");
            dataContainer.style.padding = "10px";
            dataContainer.style.backgroundColor = "#f5f5f5";
            dataContainer.style.borderRadius = "4px";
            dataContainer.style.marginBottom = "10px";

            const title = document.createElement("strong");
            title.textContent = "Previously Collected Data:";
            dataContainer.appendChild(title);

            if (phData.ph) {
              const phItem = document.createElement("div");
              phItem.textContent = `pH: ${phData.ph}`;
              phItem.style.marginTop = "5px";
              dataContainer.appendChild(phItem);
            }

            dataDisplayDiv.appendChild(dataContainer);
          }
        }

        dlg.showModal();
      }
    } else if (currentSubject === "QTPH") {
      const dlg = document.getElementById("collectDataDialogQTPH");
      if (dlg) {
        // Fetch and display existing pH data
        const tempData = await fetchQTPHData(iid);
        const dataDisplayDiv = document.getElementById(
          "collectDataDisplayQTPH",
        );
        if (dataDisplayDiv) {
          // Clear existing display
          dataDisplayDiv.innerHTML = "";

          if (tempData && tempData.ph) {
            const dataContainer = document.createElement("div");
            dataContainer.style.padding = "10px";
            dataContainer.style.backgroundColor = "#f5f5f5";
            dataContainer.style.borderRadius = "4px";
            dataContainer.style.marginBottom = "10px";

            const title = document.createElement("strong");
            title.textContent = "Previously Collected Data:";
            dataContainer.appendChild(title);

            if (tempData.ph) {
              const phP = document.createElement("p");
              phP.style.margin = "5px 0";
              phP.textContent = `pH: ${tempData.ph}`;
              dataContainer.appendChild(phP);
            }

            dataDisplayDiv.appendChild(dataContainer);
          }
        }

        dlg.showModal();
      }
    } else if (currentSubject === "QTPC") {
      const dlg = document.getElementById("collectDataDialogQTPC");
      if (dlg) {
        // Fetch and display existing seconds data
        const tempData = await fetchQTPCData(iid);
        const dataDisplayDiv = document.getElementById(
          "collectDataDisplayQTPC",
        );
        if (dataDisplayDiv) {
          // Clear existing display
          dataDisplayDiv.innerHTML = "";

          if (tempData && tempData.seconds) {
            const dataContainer = document.createElement("div");
            dataContainer.style.padding = "10px";
            dataContainer.style.backgroundColor = "#f5f5f5";
            dataContainer.style.borderRadius = "4px";
            dataContainer.style.marginBottom = "10px";

            const title = document.createElement("strong");
            title.textContent = "Previously Collected Data:";
            dataContainer.appendChild(title);

            if (tempData.seconds) {
              const secondsP = document.createElement("p");
              secondsP.style.margin = "5px 0";
              secondsP.textContent = `Seconds: ${tempData.seconds}`;
              dataContainer.appendChild(secondsP);
            }

            dataDisplayDiv.appendChild(dataContainer);
          }
        }

        dlg.showModal();
      }
    } else {
      // Default to CSR collect dialog for all other subjects
      const dlg = document.getElementById("collectDataDialog");
      if (dlg) dlg.showModal();
    }
  }
});

const url = `${apiUrls.input}${iid}`;
const main = document.querySelector("main");

// Clear main element
while (main.firstChild) {
  main.removeChild(main.firstChild);
}

// Helper function to fetch 11PH data
async function fetch11PHData(inputId) {
  try {
    const response = await fetch(`${apiUrls.acert}temp-data/${inputId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Error fetching pH data:", err);
    return null;
  }
}

// Helper function to fetch 01TE temperature data
async function fetch01TETemperatureData(inputId) {
  try {
    const response = await fetch(`${apiUrls.acert}temp-data/${inputId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Error fetching temperature data:", err);
    return null;
  }
}

// Helper function to fetch 03TE temperature data
async function fetch03TETemperatureData(inputId) {
  try {
    const response = await fetch(`${apiUrls.acert}temp-data/${inputId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Error fetching temperature data:", err);
    return null;
  }
}

// Helper function to fetch 05TE temperature data
async function fetch05TETemperatureData(inputId) {
  try {
    const response = await fetch(`${apiUrls.acert}temp-data/${inputId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Error fetching temperature data:", err);
    return null;
  }
}

// Helper function to fetch 07TE temperature data
async function fetch07TETemperatureData(inputId) {
  try {
    const response = await fetch(`${apiUrls.acert}temp-data/${inputId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Error fetching temperature data:", err);
    return null;
  }
}

// Helper function to fetch 13TE pH data
async function fetch13TEpHData(inputId) {
  try {
    const response = await fetch(`${apiUrls.acert}ph-data/${inputId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Error fetching pH data:", err);
    return null;
  }
}

// Helper function to fetch 08TE pH and temperature data
async function fetch08TETemperatureData(inputId) {
  try {
    const response = await fetch(`${apiUrls.acert}temp-data/${inputId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Error fetching pH and temperature data:", err);
    return null;
  }
}

// Helper function to fetch QTPH data
async function fetchQTPHData(inputId) {
  try {
    const response = await fetch(`${apiUrls.acert}temp-data/${inputId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Error fetching Tank Q pH data:", err);
    return null;
  }
}

// Helper function to fetch QTPC data
async function fetchQTPCData(inputId) {
  try {
    const response = await fetch(`${apiUrls.acert}temp-data/${inputId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Error fetching Tank Q seconds data:", err);
    return null;
  }
}

// Helper function to update DOM after AJAX save
async function updateAfterSave() {
  const response = await fetch(url, { method: "GET" });
  const record = await response.json();

  // Get the first (and usually only) key from the record
  const key = Object.keys(record)[0];
  const rec = record[key];

  // Update specific DOM elements
  const closedDateElem = document.querySelector("#closed");
  if (closedDateElem) {
    closedDateElem.textContent = `Closed Date: ${formatDate(rec["CLOSED_DATE"])}`;
  }

  const assignedElem = document.querySelector("#assignedto");
  if (assignedElem) {
    assignedElem.textContent = `Assigned To: ${rec["ASSIGNED_TO"]}`;
  }

  const dueDateElem = document.querySelector("#duedate");
  if (dueDateElem) {
    dueDateElem.textContent = `Due date: ${formatDate(rec["DUE_DATE"])}`;
  }

  const subjectElem = document.querySelector("#subject");
  if (subjectElem) {
    subjectElem.textContent = `Subject: ${rec["SUBJECT"]}`;
  }

  // Update notes sections
  const actionNote = document.querySelector("#actionNote");
  if (actionNote && rec["INPUT_TEXT"]) {
    actionNote.innerHTML = rec["INPUT_TEXT"].replace(/\n/g, "<br>");
  }

  const followupNote = document.querySelector("#followUpNote");
  if (followupNote && rec["FOLLOWUP_TEXT"]) {
    followupNote.innerHTML = rec["FOLLOWUP_TEXT"].replace(/\n/g, "<br>");
  }

  const responseNote = document.querySelector("#responseNote");
  if (responseNote && rec["RESPONSE_TEXT"]) {
    responseNote.innerHTML = rec["RESPONSE_TEXT"].replace(/\n/g, "<br>");
  }

  // Handle close button state
  const btnClose = document.querySelector("#btnClose");
  if (btnClose && (rec["CLOSED"] === "Y" || rec["CLOSED_DATE"])) {
    btnClose.disabled = true;
    btnClose.style.opacity = "0.5";
    btnClose.style.cursor = "not-allowed";
    btnClose.style.backgroundColor = "#e0e0e0";
    btnClose.title = "This action item is already closed";
  }
}

fetch(url, { method: "GET" })
  .then((response) => response.json())
  .then(async (record) => {
    for (const key in record) {
      const rec = record[key];

      // Store the current subject for use in collect dialog
      currentSubject = rec["SUBJECT"] || "";

      // Create detail section
      const detailSection = createElement("section", {
        className: "section",
        id: "detailSection",
      });

      // Header elements
      const elemRpt = createElement("h1", {
        className: "header",
        text: "Action Item Detail",
      });
      const elemId = createElement("h2", {
        className: "header2",
        text: `Action Id: ${rec["INPUT_ID"]}`,
      });

      // Detail title
      const detailTitle = createElement("h3", {
        className: "span-2",
        text: "Detail",
      });

      // Detail buttons
      const detailButtons = createElement("div", {
        className: "detailButtons",
        id: "detailButtons",
      });
      detailButtons.style.display = "flex";
      detailButtons.style.gap = "0.5rem";
      const btnEditDetail = createElement("button", {
        className: "btn btnEdit",
        id: "btnEditDetail",
        text: "Edit",
        type: "submit",
      });
      btnEditDetail.style.textTransform = "capitalize";
      btnEditDetail.style.borderRadius = "0.25rem";
      btnEditDetail.style.display = "flex";
      btnEditDetail.style.alignItems = "center";
      btnEditDetail.style.justifyContent = "center";
      const btnFollowUp = createElement("button", {
        className: "btn btnEdit",
        id: "btnFollowUp",
        text: "Email",
        type: "submit",
      });
      btnFollowUp.style.textTransform = "capitalize";
      btnFollowUp.style.borderRadius = "0.25rem";
      btnFollowUp.style.display = "flex";
      btnFollowUp.style.alignItems = "center";
      btnFollowUp.style.justifyContent = "center";

      detailButtons.appendChild(btnFollowUp);
      detailButtons.appendChild(btnEditDetail);

      // Detail information elements
      const aiDate = createElement("p", {
        className: "tbl",
        text: `Request Date: ${formatDate(rec["INPUT_DATE"])}`,
      });

      const projId = createElement("p", {
        className: "tbl",
        id: "project",
        text: `Project: ${rec["PROJECT_ID"]} - ${rec["NAME"]}`,
      });

      const aiClosedDate = createElement("p", {
        className: "tbl",
        id: "closed",
        text: `Closed Date: ${formatDate(rec["CLOSED_DATE"])}`,
      });

      const aiAssTo = createElement("p", {
        className: "tbl",
        id: "assignedto",
        text: `Assigned To: ${rec["ASSIGNED_TO"]}`,
      });

      const reqBy = createElement("p", {
        className: "tbl",
        id: "requestby",
        text: `Request By: ${rec["PEOPLE_ID"]}`,
      });

      const due_date = createElement("p", {
        className: "tbl",
        id: "duedate",
        text: `Due date: ${formatDate(rec["DUE_DATE"])}`,
      });

      const elemSubject = createElement("p", {
        className: "tbl",
        id: "subject",
        text: `Subject: ${rec["SUBJECT"]}`,
      });

      const elemType = createElement("p", {
        className: "tbl",
        id: "type",
        text: `Type: ${rec["INPUT_TYPE"] || ""}`,
      });

      // Subtitle div with close button
      const divSubTitle = createElement("div", {
        className: "subtitlewithbutton",
      });
      divSubTitle.appendChild(elemId);

      const btnClose = createElement("button", {
        className: "closebutton",
        id: "btnClose",
        text: "Close Action",
        type: "submit",
      });
      // Store record data on button for later access
      btnClose.dataset.closed = rec["CLOSED"] || "";
      btnClose.dataset.closedDate = rec["CLOSED_DATE"] || "";

      // Create a buttons container for proper alignment
      const buttonsContainer = document.createElement("div");
      buttonsContainer.style.display = "flex";
      buttonsContainer.style.justifyContent = "flex-end";
      buttonsContainer.style.alignItems = "center";
      buttonsContainer.style.gap = "10px";

      // Add escalation button if overdue
      const daysOverdue = calculateDaysOverdue(rec["DUE_DATE"]);
      if (daysOverdue > 0 && rec["CLOSED"] !== "Y") {
        const escalationBtn = createEscalationButton(
          "INPUT",
          rec["INPUT_ID"],
          rec["SUBJECT"],
          rec["ASSIGNED_TO"],
          daysOverdue,
          user,
          () => {
            // Refresh page on successful escalation
            location.reload();
          },
        );
        escalationBtn.style.display = "none"; // Hide escalation button
        buttonsContainer.appendChild(escalationBtn);
      }

      // Add close button to container
      buttonsContainer.appendChild(btnClose);
      divSubTitle.appendChild(buttonsContainer);

      // Assemble detail section
      detailSection.appendChild(detailTitle);
      detailSection.appendChild(detailButtons);
      detailSection.appendChild(aiDate);
      detailSection.appendChild(aiAssTo);
      detailSection.appendChild(aiClosedDate);
      detailSection.appendChild(projId);
      detailSection.appendChild(reqBy);
      detailSection.appendChild(due_date);
      detailSection.appendChild(elemSubject);
      detailSection.appendChild(elemType);

      // Add to main
      main.appendChild(elemRpt);
      main.appendChild(divSubTitle);
      main.appendChild(detailSection);

      // Create notes sections
      createNotesSection("INPUT_TEXT", rec["INPUT_TEXT"]);
      createNotesSection(
        "FOLLOWUP_TEXT",
        rec["FOLLOWUP_TEXT"],
        null,
        rec["FOLLOWUP_DATE"],
        rec["FOLLOWUP_BY"],
      );
      createNotesSection(
        "RESPONSE_TEXT",
        rec["RESPONSE_TEXT"],
        null,
        rec["RESPONSE_DATE"],
        rec["RESPONSE_BY"],
      );

      // Add escalation history
      const escalationHistory = await createEscalationHistory(
        "INPUT",
        rec["INPUT_ID"],
      );
      escalationHistory.style.display = "none"; // Hide escalation history
      main.appendChild(escalationHistory);
    }

    // ===== Response Handler =====
    const btnEditResp = document.getElementById("editResponse");
    if (btnEditResp) {
      btnEditResp.addEventListener("click", async (event) => {
        event.preventDefault();
        const responseDialog = document.querySelector("#respDialog");
        const newResponseDateInput = document.querySelector("#newResponseDate");

        // Set response date if not already set
        if (!newResponseDateInput.value) {
          newResponseDateInput.value = formatDate(new Date().toISOString());
        }

        responseDialog.showModal();

        // Cancel handler
        document.querySelector("#cancelResp").addEventListener("click", () => {
          responseDialog.close();
        });

        // Save handler
        document
          .querySelector("#saveResp")
          .addEventListener("click", async (event) => {
            event.preventDefault();

            const oldResponseText =
              document.querySelector("#responseNote").innerHTML;
            const newResponseText =
              document.querySelector("#newTextResp").value;
            const responseText = timestampText(
              user,
              newResponseText,
              oldResponseText,
            );

            const data = {
              INPUT_ID: iid,
              INPUT_USER: user,
              RESPONSE_TEXT: responseText,
              RESPONSE_DATE: newResponseDateInput.value,
              RESPONSE_BY: user,
              MODIFIED_BY: user,
              MODIFIED_DATE: getDateTime(),
            };

            const response = await fetch(`${apiUrls.input}${iid}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data }),
            });
            const result = await response.json();
            if (result.warning) {
              alert(result.warning);
            }

            responseDialog.close();
            await updateAfterSave();
          });
      });
    }

    // ===== Action Handler =====
    const btnEditAction = document.querySelector("#editAction");
    if (btnEditAction) {
      btnEditAction.addEventListener("click", async (event) => {
        event.preventDefault();
        const actionDialog = document.querySelector("#actionDialog");
        actionDialog.showModal();

        document
          .querySelector("#cancelAction")
          .addEventListener("click", () => {
            actionDialog.close();
          });

        document
          .querySelector("#saveAction")
          .addEventListener("click", async (event) => {
            event.preventDefault();

            const newActionText =
              document.querySelector("#newTextAction").value;
            if (!newActionText.trim()) {
              alert("Action text cannot be empty");
              return;
            }

            const oldActionText =
              document.querySelector("#actionNote").innerHTML;
            const actionText = timestampText(
              user,
              newActionText,
              oldActionText,
            ).replace(/\n/g, "<br>");

            const data = {
              INPUT_ID: iid,
              INPUT_USER: user,
              INPUT_TEXT: actionText,
            };

            const response = await fetch(`${apiUrls.input}${iid}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data }),
            });
            const result = await response.json();
            if (result.warning) {
              alert(result.warning);
            }

            actionDialog.close();
            await updateAfterSave();
          });
      });
    }

    // ===== Follow Up Handler =====
    const btnEditFlup = document.querySelector("#editFollowUp");
    if (btnEditFlup) {
      btnEditFlup.addEventListener("click", async (event) => {
        event.preventDefault();
        const followUpDialog = document.querySelector("#followupDialog");
        const newFollowUpDateInput = document.querySelector("#newFollowUpDate");

        // Set followup date if not already set
        if (!newFollowUpDateInput.value) {
          newFollowUpDateInput.value = formatDate(new Date().toISOString());
        }

        followUpDialog.showModal();

        document
          .querySelector("#cancelFollowUp")
          .addEventListener("click", () => {
            followUpDialog.close();
          });

        document
          .querySelector("#saveFlup")
          .addEventListener("click", async (event) => {
            event.preventDefault();

            const newFollowUpText =
              document.querySelector("#newTextFollowup").value;
            const oldFollowUpText =
              document.querySelector("#followUpNote").innerHTML;
            const followUpText = timestampText(
              user,
              newFollowUpText,
              oldFollowUpText,
            );

            const data = {
              INPUT_ID: iid,
              INPUT_USER: user,
              FOLLOWUP_TEXT: followUpText,
              FOLLOWUP_DATE: newFollowUpDateInput.value,
              FOLLOWUP_BY: user,
              MODIFIED_BY: user,
              MODIFIED_DATE: getDateTime(),
            };

            const response = await fetch(`${apiUrls.input}${iid}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data }),
            });
            const result = await response.json();
            if (result.warning) {
              alert(result.warning);
            }

            followUpDialog.close();
            await updateAfterSave();
          });
      });
    }
    // ===== Close Action Handler =====
    const btnClose = document.querySelector("#btnClose");
    if (btnClose) {
      // Disable button if record is already closed
      if (
        btnClose.dataset.closed === "Y" ||
        (btnClose.dataset.closedDate &&
          btnClose.dataset.closedDate.trim() !== "")
      ) {
        btnClose.disabled = true;
        btnClose.style.opacity = "0.5";
        btnClose.style.cursor = "not-allowed";
        btnClose.style.backgroundColor = "#e0e0e0";
        btnClose.title = "This action item is already closed";
      }

      btnClose.addEventListener("click", async (event) => {
        event.preventDefault();

        // Check if already closed
        if (
          btnClose.dataset.closed === "Y" ||
          (btnClose.dataset.closedDate &&
            btnClose.dataset.closedDate.trim() !== "")
        ) {
          alert("This action item is already closed");
          return;
        }

        let paddedId = String(iid).padStart(7, "0");
        const data = {
          INPUT_ID: paddedId,
          CLOSED: "Y",
          CLOSED_DATE: getDateTime(),
        };

        await fetch(`${apiUrls.input}close/${paddedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        // Disable the button and update visual state
        btnClose.disabled = true;
        btnClose.style.opacity = "0.5";
        btnClose.style.cursor = "not-allowed";
        btnClose.style.backgroundColor = "#e0e0e0";
        btnClose.title = "This action item is already closed";

        await updateAfterSave();
      });
    }

    // ===== Edit Detail Handler =====
    const btnEditDetail = document.querySelector("#btnEditDetail");
    if (btnEditDetail) {
      btnEditDetail.addEventListener("click", async (event) => {
        event.preventDefault();
        const detailDialog = document.querySelector("#inputDialog");
        detailDialog.showModal();

        // Populate fields
        const assignedToElem = document.querySelector("#assignedto");
        const dueDateElem = document.querySelector("#duedate");
        const projectElem = document.querySelector("#project");
        const requestByElem = document.querySelector("#requestby");
        const subjectElem = document.querySelector("#subject");
        const typeElem = document.querySelector("#type");

        document.querySelector("#ASSIGNED_TO").value = extractText(
          assignedToElem.textContent,
          13,
        );
        document.querySelector("#DUE_DATE").value = extractText(
          dueDateElem.textContent,
          10,
        );
        document.querySelector("#PROJECT_ID").value = extractText(
          projectElem.textContent,
          9,
        ).split(" ")[0];
        document.querySelector("#REQUESTED_BY").value = extractText(
          requestByElem.textContent,
          11,
        );
        document.querySelector("#SUBJECT").value = extractText(
          subjectElem.textContent,
          9,
        );
        document.querySelector("#INPUT_TYPE").value = extractText(
          typeElem.textContent,
          6,
        );

        document.querySelector("#cancelEdit").addEventListener("click", () => {
          detailDialog.close();
        });

        document
          .querySelector("#saveDetail")
          .addEventListener("click", async (event) => {
            event.preventDefault();

            const data = {
              INPUT_ID: iid,
              ASSIGNED_TO: document.querySelector("#ASSIGNED_TO").value,
              DUE_DATE: document.querySelector("#DUE_DATE").value,
              PROJECT_ID: document.querySelector("#PROJECT_ID").value,
              REQUESTED_BY: document.querySelector("#REQUESTED_BY").value,
              SUBJECT: document.querySelector("#SUBJECT").value,
              INPUT_TYPE: document.querySelector("#INPUT_TYPE").value,
              MODIFIED_DATE: getDateTime(),
              MODIFIED_BY: user,
            };

            // Validate username fields
            const assignedToValidation = validateUsernameField(
              "assigned-to",
              data.ASSIGNED_TO,
            );
            if (!assignedToValidation.isValid) {
              alert(assignedToValidation.message);
              return;
            }

            const requestedByValidation = validateUsernameField(
              "requested-by",
              data.REQUESTED_BY,
            );
            if (!requestedByValidation.isValid) {
              alert(requestedByValidation.message);
              return;
            }

            // Validate code fields
            if (data.SUBJECT) {
              const subjectValidation = validateCodeField(
                "subject",
                data.SUBJECT,
              );
              if (!subjectValidation.isValid) {
                alert(subjectValidation.message);
                return;
              }
            }

            const response = await fetch(`${apiUrls.input}detail/${iid}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data }),
            });
            const result = await response.json();
            if (result.warning) {
              alert(result.warning);
            }

            // Check if ASSIGNED_TO changed and send assignment email
            const currentAssignedTo = extractText(
              document.querySelector("#assignedto").textContent,
              13,
            );
            const newAssignedTo = data.ASSIGNED_TO;

            if (
              currentAssignedTo !== newAssignedTo &&
              newAssignedTo &&
              newAssignedTo.trim()
            ) {
              // Fetch fresh record to get all details for email
              const recordResponse = await fetch(url);
              const records = await recordResponse.json();
              const rec = records[0];

              const userEmail =
                userEmails[newAssignedTo] ?? userEmails["DEFAULT"];

              const emailData = {
                INPUT_ID: iid,
                SUBJECT: rec.SUBJECT || "",
                DUE_DATE: rec.DUE_DATE ? rec.DUE_DATE.slice(0, 10) : "",
                ASSIGNED_TO: newAssignedTo,
                INPUT_TEXT: rec.INPUT_TEXT || "",
                ASSIGNED_TO_EMAIL: userEmail,
              };

              // Send notification email
              try {
                console.log(
                  "Attempting to send email to:",
                  userEmail,
                  "for INPUT_ID:",
                  iid,
                );
                console.log("Email endpoint URL:", `${apiUrls.input}email`);
                console.log("Email data:", emailData);

                const emailResponse = await fetch(`${apiUrls.input}email`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(emailData),
                });

                console.log("Email response status:", emailResponse.status);
                const emailResult = await emailResponse.json();
                console.log("Email response data:", emailResult);

                if (!emailResponse.ok) {
                  console.error(
                    "Email send failed with status:",
                    emailResponse.status,
                    emailResult,
                  );
                } else {
                  console.log("Email sent successfully");
                }

                // Log notification in database
                const notifyResponse = await fetch(
                  `${apiUrls.input}inputs_notify`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      data: {
                        INPUT_ID: iid,
                        ASSIGNED_TO: newAssignedTo,
                        RECIPIENT_EMAIL: userEmail,
                        SUBJECT: emailData.SUBJECT,
                        BODY: emailData.INPUT_TEXT,
                        ACTION: "A",
                      },
                    }),
                  },
                );
                const notifyResult = await notifyResponse.json();
                console.log("inputs_notify response:", notifyResult);
                console.log("inputs_notify recorded for INPUT_ID", iid);
              } catch (err) {
                console.error("Error sending assignment email:", err);
                console.error("Error stack:", err.stack);
              }
            }

            detailDialog.close();
            await updateAfterSave();
          });
      });
    }

    // ===== Email Handler =====
    const btnFollowUp = document.querySelector("#btnFollowUp");
    if (btnFollowUp) {
      btnFollowUp.addEventListener("click", async (event) => {
        event.preventDefault();
        const emailDialog = document.querySelector("#emailDialog");
        document.querySelector("#emailCommentText").value = "";
        emailDialog.showModal();

        document
          .querySelector("#cancelEmailComment")
          .addEventListener("click", () => {
            emailDialog.close();
          });

        document
          .querySelector("#saveEmailComment")
          .addEventListener("click", async (event) => {
            event.preventDefault();

            const assignedToText = extractText(
              document.querySelector("#assignedto").textContent,
              13,
            );
            const userEmail =
              userEmails[assignedToText] ?? userEmails["DEFAULT"];

            const actionNoteElem = document.querySelector("#actionNote");
            const followUpNoteElem = document.querySelector("#followUpNote");
            const projectText = extractText(
              document.querySelector("#project").textContent,
              9,
            ).split(" ")[0];

            const emailData = {
              INPUT_ID: iid,
              from: "quality@ci-aviation.com",
              to: userEmail,
              subject: `Action Item Updated: ${iid}`,
              text: `Project: ${projectText}\n\nAction: \n\n${
                actionNoteElem?.innerText ?? ""
              }\n\nFollow-up: \n\n${
                followUpNoteElem?.innerText ?? ""
              }\n\nEmail comment: ${
                document.querySelector("#emailCommentText").value || ""
              }`,
            };

            // Send email with detailed logging
            console.log(
              "Follow-up email endpoint:",
              `${apiUrls.input}email/${iid}`,
            );
            console.log("Follow-up email data:", emailData);

            fetch(`${apiUrls.input}email/${iid}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: emailData }),
            })
              .then((response) => {
                console.log(
                  "Follow-up email response status:",
                  response.status,
                );
                return response.json();
              })
              .then((result) => {
                console.log("Follow-up email response data:", result);
              })
              .catch((err) => {
                console.error("Error sending follow-up email:", err);
                console.error("Error stack:", err.stack);
              });

            // Update notification table
            const notifyData = {
              INPUT_ID: iid,
              ASSIGNED_TO: assignedToText,
              ACTION: "R",
            };

            try {
              await fetch(`${apiUrls.input}inputs_notify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: notifyData }),
              });
            } catch (err) {
              console.error("Error updating inputs_notify:", err);
            }

            emailDialog.close();
            await updateAfterSave();
          });
      });
    }
  });
