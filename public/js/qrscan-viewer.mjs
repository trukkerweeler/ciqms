const resultsEl = document.getElementById("results");
let entries = [];
let currentIndex = 0;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderCurrentEntry() {
  resultsEl.innerHTML = "";

  if (!entries.length) {
    resultsEl.innerHTML = '<div class="card">No QR scan entries found.</div>';
    return;
  }

  const entry = entries[currentIndex];
  const pager = document.createElement("div");
  pager.className = "pager";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "← Previous";
  prevBtn.disabled = currentIndex === 0;
  prevBtn.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + entries.length) % entries.length;
    renderCurrentEntry();
  });

  const counter = document.createElement("div");
  counter.className = "counter";
  counter.textContent = `${currentIndex + 1} / ${entries.length}`;

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next →";
  nextBtn.disabled = currentIndex === entries.length - 1;
  nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % entries.length;
    renderCurrentEntry();
  });

  pager.appendChild(prevBtn);
  pager.appendChild(counter);
  pager.appendChild(nextBtn);
  resultsEl.appendChild(pager);

  const item = document.createElement("div");
  item.className = "card item";
  item.innerHTML = `
    <div class="meta">
      <strong>QR:</strong> ${escapeHtml(entry.qrData || "")}
      <span>•</span>
      <strong>File:</strong> ${escapeHtml(entry.originalFile || entry.pdfPath || "")}
      <span>•</span>
      <strong>Month:</strong> ${escapeHtml(entry.monthLabel || "")}
      <span>•</span>
      <strong>Input ID:</strong> ${escapeHtml(entry.inputId || "(none)")}
      <span>•</span>
      <strong>Input Date:</strong> ${escapeHtml(entry.inputDate || "")}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 8px 0;min-height:40px;">
      <div class="${entry.inputId ? "status matched" : "status unmatched"}">
        ${entry.inputId ? "Matched input record" : "No matching input record"}
      </div>
      <div class="action-panel">
      <input class="destination-path" type="text" placeholder="Destination path (optional)" value="${escapeHtml(entry.destinationPath || "")}" style="flex:1 1 360px;min-width:280px;height:38px;box-sizing:border-box;line-height:1.2;margin:0;" />
      <select class="pm-select" aria-label="Disposition" style="flex:0 0 200px;height:38px;box-sizing:border-box;line-height:1.2;margin:0;">
        <option value="">Select disposition…</option>
        ${
          entry.subject && entry.subject.toUpperCase().startsWith("PM")
            ? `
            <option value="Scanned and filed">Scanned and filed</option>
            <option value="Inop">Inop</option>
            <option value="No entries">No entries</option>
          `
            : `
            <option value="Scanned and filed">Scanned and filed</option>
            <option value="Expired">Expired</option>
            <option value="Not done">Not done</option>
          `
        }
      </select>
    </div>
    ${(() => {
      const subjectCode = (entry.subject || entry.qrData || "")
        .toString()
        .trim()
        .toUpperCase();

      if (subjectCode === "01TE") {
        return `
            <div class="measurement-panel">
              <div class="measurement-header-row">
                <h4>01TE Measurement Collection</h4>
                <div class="measurement-grid">
                <div class="measurement-field">
                  <label for="measurementPercent">Percent</label>
                  <input id="measurementPercent" name="measurementPercent" type="text" placeholder="Enter percent" />
                </div>
                <div class="measurement-field">
                  <label for="measurementFahrenheit">Fahrenheit</label>
                  <input id="measurementFahrenheit" name="measurementFahrenheit" type="text" placeholder="Enter Fahrenheit" />
                </div>
              </div>
                <div class="measurement-actions">
                  <span class="measurement-status">Values are saved with the main Save button.</span>
                </div>
              </div>
            </div>
          `;
      }

      if (subjectCode === "QTPC") {
        return `
            <div class="measurement-panel">
              <div class="measurement-header-row">
                <h4>QTPC Measurement Collection</h4>
                <div class="measurement-grid">
                <div class="measurement-field">
                  <label for="measurementSeconds">Seconds</label>
                  <input id="measurementSeconds" name="measurementSeconds" type="text" placeholder="Enter seconds" />
                </div>
              </div>
                <div class="measurement-actions">
                  <span class="measurement-status">Values are saved with the main Save button.</span>
                </div>
              </div>
            </div>
          `;
      }

      if (subjectCode === "03TE") {
        return `
            <div class="measurement-panel">
              <div class="measurement-header-row">
                <h4>03TE Measurement Collection</h4>
                <div class="measurement-grid">
                <div class="measurement-field">
                  <label for="measurementFahrenheit03">Fahrenheit</label>
                  <input id="measurementFahrenheit03" name="measurementFahrenheit03" type="text" placeholder="Enter Fahrenheit" />
                </div>
              </div>
                <div class="measurement-actions">
                  <span class="measurement-status">Values are saved with the main Save button.</span>
                </div>
              </div>
            </div>
          `;
      }

      if (["05TE", "07TE", "08TE"].includes(subjectCode)) {
        const titleMap = {
          "05TE": "05TE Measurement Collection",
          "07TE": "07TE Measurement Collection",
          "08TE": "08TE Measurement Collection",
        };
        const inputMap = {
          "05TE": `
              <div class="measurement-field">
                <label for="measurementFahrenheit05">Fahrenheit</label>
                <input id="measurementFahrenheit05" name="measurementFahrenheit05" type="text" placeholder="Enter Fahrenheit" />
              </div>
            `,
          "07TE": `
              <div class="measurement-field">
                <label for="measurementFahrenheit07">Fahrenheit</label>
                <input id="measurementFahrenheit07" name="measurementFahrenheit07" type="text" placeholder="Enter Fahrenheit" />
              </div>
            `,
          "08TE": `
              <div class="measurement-field">
                <label for="measurementPh08">pH</label>
                <input id="measurementPh08" name="measurementPh08" type="text" placeholder="Enter pH" />
              </div>
              <div class="measurement-field">
                <label for="measurementFahrenheit08">Fahrenheit</label>
                <input id="measurementFahrenheit08" name="measurementFahrenheit08" type="text" placeholder="Enter Fahrenheit" />
              </div>
            `,
        };

        return `
            <div class="measurement-panel">
              <div class="measurement-header-row">
                <h4>${titleMap[subjectCode]}</h4>
                <div class="measurement-grid">
                ${inputMap[subjectCode]}
              </div>
                <div class="measurement-actions">
                  <span class="measurement-status">Values are saved with the main Save button.</span>
                </div>
              </div>
            </div>
          `;
      }

      if (subjectCode === "13TE") {
        return `
            <div class="measurement-panel">
              <div class="measurement-header-row">
                <h4>13TE Measurement Collection</h4>
                <div class="measurement-grid">
                <div class="measurement-field">
                  <label for="measurementPh13">pH</label>
                  <input id="measurementPh13" name="measurementPh13" type="text" placeholder="Enter pH" />
                </div>
              </div>
                <div class="measurement-actions">
                  <span class="measurement-status">Values are saved with the main Save button.</span>
                </div>
              </div>
            </div>
          `;
      }

      if (subjectCode === "QTPH") {
        return `
            <div class="measurement-panel">
              <div class="measurement-header-row">
                <h4>QTPH Measurement Collection</h4>
                <div class="measurement-grid">
                <div class="measurement-field">
                  <label for="measurementPhQtph">pH</label>
                  <input id="measurementPhQtph" name="measurementPhQtph" type="text" placeholder="Enter pH" />
                </div>
              </div>
                <div class="measurement-actions">
                  <span class="measurement-status">Values are saved with the main Save button.</span>
                </div>
              </div>
            </div>
          `;
      }

      if (subjectCode === "11PH") {
        return `
            <div class="measurement-panel">
              <div class="measurement-header-row">
                <h4>11PH Measurement Collection</h4>
                <div class="measurement-grid">
                <div class="measurement-field">
                  <label for="measurementPh11ph">pH</label>
                  <input id="measurementPh11ph" name="measurementPh11ph" type="text" placeholder="Enter pH" />
                </div>
              </div>
                <div class="measurement-actions">
                  <span class="measurement-status">Values are saved with the main Save button.</span>
                </div>
              </div>
            </div>
          `;
      }

      return "";
    })()}
    <div class="save-footer">
      <button class="save-btn" type="button" ${!entry.inputId ? "disabled" : ""}>Save &amp; File</button>
      <span class="save-message"></span>
    </div>
    <iframe src="${entry.pdfViewerUrl}" title="PDF viewer"></iframe>
  `;

  const saveButton = item.querySelector(".save-btn");
  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      const select = item.querySelector(".pm-select");
      const destinationInput = item.querySelector(".destination-path");
      const statusMessage = item.querySelector(".save-message");
      const measurementStatus = item.querySelector(".measurement-status");
      const selectedOption = select?.value?.trim();
      const percentInput = item.querySelector("#measurementPercent");
      const fahrenheitInput = item.querySelector("#measurementFahrenheit");
      const secondsInput = item.querySelector("#measurementSeconds");
      const fahrenheit05Input = item.querySelector("#measurementFahrenheit05");
      const fahrenheit07Input = item.querySelector("#measurementFahrenheit07");
      const fahrenheit03Input = item.querySelector("#measurementFahrenheit03");
      const ph08Input = item.querySelector("#measurementPh08");
      const fahrenheit08Input = item.querySelector("#measurementFahrenheit08");
      const ph13Input = item.querySelector("#measurementPh13");
      const phQtphInput = item.querySelector("#measurementPhQtph");
      const ph11phInput = item.querySelector("#measurementPh11ph");
      const percentValue = percentInput?.value?.trim();
      const fahrenheitValue = fahrenheitInput?.value?.trim();
      const secondsValue = secondsInput?.value?.trim();
      const fahrenheit05Value = fahrenheit05Input?.value?.trim();
      const fahrenheit07Value = fahrenheit07Input?.value?.trim();
      const fahrenheit03Value = fahrenheit03Input?.value?.trim();
      const ph08Value = ph08Input?.value?.trim();
      const fahrenheit08Value = fahrenheit08Input?.value?.trim();
      const ph13Value = ph13Input?.value?.trim();
      const phQtphValue = phQtphInput?.value?.trim();
      const ph11phValue = ph11phInput?.value?.trim();
      const measurementPayload = {
        PERCENT: percentValue || null,
        FAHRENHEIT:
          fahrenheitValue ||
          fahrenheit05Value ||
          fahrenheit07Value ||
          fahrenheit03Value ||
          fahrenheit08Value ||
          null,
        SECONDS: secondsValue || null,
        PH: ph08Value || ph13Value || phQtphValue || ph11phValue || null,
      };
      const hasMeasurementValues = Object.values(measurementPayload).some(
        (value) => value !== null && value !== "",
      );

      if (!selectedOption) {
        statusMessage.textContent = "Please choose a disposition first.";
        return;
      }

      if (hasMeasurementValues && !entry.inputId) {
        statusMessage.textContent =
          "No input record is available for this item.";
        return;
      }

      saveButton.disabled = true;
      statusMessage.textContent = "Saving…";
      if (measurementStatus) {
        measurementStatus.textContent = "Saving…";
      }

      try {
        if (hasMeasurementValues) {
          const response = await fetch(
            `/input/collect/${encodeURIComponent(entry.inputId)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                data: measurementPayload,
              }),
            },
          );

          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload.success) {
            throw new Error(payload.error || "Measurement save failed");
          }
        }

        const response = await fetch("/qrscan/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputId: entry.inputId,
            qrData: entry.qrData,
            subject: entry.subject || entry.qrData || "",
            inputDate: entry.inputDate || "",
            originalFile: entry.originalFile,
            sourceName: entry.sourceName,
            pdfPath: entry.pdfPath,
            selectedOption,
            destinationPath: destinationInput?.value?.trim() || "",
            user:
              localStorage.getItem("currentUser") ||
              localStorage.getItem("user") ||
              "SYSTEM",
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Save failed");
        }

        const finishMessage = hasMeasurementValues
          ? "Saved and filed: measurement recorded, disposition applied, and queue item removed."
          : payload.movedFile
            ? "Saved and filed: removed from queue and copied successfully."
            : "Saved and filed: removed from queue.";
        statusMessage.textContent = finishMessage;
        if (measurementStatus) {
          measurementStatus.textContent = hasMeasurementValues
            ? "Measurement saved and filed."
            : "No measurement values entered.";
        }
        if (percentInput) percentInput.value = "";
        if (fahrenheitInput) fahrenheitInput.value = "";
        if (secondsInput) secondsInput.value = "";
        if (fahrenheit05Input) fahrenheit05Input.value = "";
        if (fahrenheit07Input) fahrenheit07Input.value = "";
        if (fahrenheit03Input) fahrenheit03Input.value = "";
        if (ph08Input) ph08Input.value = "";
        if (fahrenheit08Input) fahrenheit08Input.value = "";
        if (ph13Input) ph13Input.value = "";
        if (phQtphInput) phQtphInput.value = "";
        if (ph11phInput) ph11phInput.value = "";
        entries.splice(currentIndex, 1);
        if (currentIndex >= entries.length) {
          currentIndex = entries.length > 0 ? entries.length - 1 : 0;
        }
        renderCurrentEntry();
      } catch (error) {
        saveButton.disabled = false;
        statusMessage.textContent = error.message;
        if (measurementStatus) {
          measurementStatus.textContent = error.message;
        }
      }
    });
  }

  resultsEl.appendChild(item);
}

async function loadData() {
  resultsEl.innerHTML = '<div class="card">Loading…</div>';
  try {
    const response = await fetch("/qrscan");
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const allEntries = await response.json();
    const missing = allEntries.filter((e) => e.pdfMissing);

    if (missing.length > 0) {
      const names = missing
        .map((e) => e.originalFile || e.pdfPath || "(unknown)")
        .join("\n");
      alert(
        `${missing.length} queue entry${missing.length > 1 ? "s" : ""} reference a missing PDF and will be removed:\n\n${names}`,
      );
      await fetch("/qrscan/missing", { method: "DELETE" });
    }

    entries = allEntries.filter((e) => !e.pdfMissing);
    currentIndex = 0;
    renderCurrentEntry();
  } catch (error) {
    resultsEl.innerHTML = `<div class="card">Failed to load QR scan data: ${error.message}</div>`;
  }
}

loadData();
