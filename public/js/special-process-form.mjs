import {
  specialProcessFormCatalog,
  specialProcessFormDefinitions,
  getFormDisplayName,
  getFormFieldGroups,
  formatProcessRangeSummary,
  getStepRequirement,
  shouldShowStepInput,
  getProcessTheme,
} from "./special-process-form-names.mjs";
// Login/computer based technician lookup retained for reference:
// import { getCurrentUser } from "./auth-utils.mjs";
import { getApiUrl } from "./utils.mjs";

const params = new URLSearchParams(window.location.search);
const formId = params.get("id");
const form = specialProcessFormCatalog.find((item) => item.id === formId);

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const formEl = document.getElementById("specialProcessForm");
const processFlowEl = document.getElementById("processFlow");
const summaryEl = document.getElementById("summary");
const backButton = document.getElementById("backButton");
const formInstanceInput = document.getElementById("formInstanceId");
const partDescriptionInput = document.getElementById("partDescription");
const technicianSelect = document.getElementById("technician");
const processDateInput = document.getElementById("processDate");
let resolvedUserName = "";

function collectStepValues(definition) {
  const rows = [];
  definition.steps.forEach((step, stepIndex) => {
    step.ranges.forEach((range, rangeIndex) => {
      const fieldId = `step-${stepIndex + 1}-${rangeIndex + 1}`;
      const input = document.getElementById(fieldId);
      const rawValue = input?.value ?? "";
      rows.push({
        stepIndex: stepIndex + 1,
        stepTitle: step.title,
        isOptional: Boolean(step.optional),
        rangeIndex: rangeIndex + 1,
        rangeLabel: range.label,
        rangeUom: range.uom,
        specMin: range.min,
        specMax: range.max,
        inputType: step.inputType || "number",
        actualNumeric:
          rawValue === "" || Number.isNaN(Number(rawValue))
            ? null
            : Number(rawValue),
        actualText: rawValue === "" ? null : String(rawValue),
        passFail:
          ["pass-fail", "yes-no"].includes(step.inputType) && rawValue
            ? String(rawValue).toUpperCase()
            : null,
        requirementText: getStepRequirement(step) || null,
      });
    });
  });
  return rows;
}

function hydrateStepValues(stepValues) {
  if (!Array.isArray(stepValues)) return;
  stepValues.forEach((row) => {
    const fieldId = `step-${Number(row.STEP_INDEX)}-${Number(row.RANGE_INDEX)}`;
    const input = document.getElementById(fieldId);
    if (!input) return;
    if (["pass-fail", "yes-no"].includes(row.INPUT_TYPE)) {
      input.value = row.PASS_FAIL || row.ACTUAL_TEXT || "";
      return;
    }
    if (row.ACTUAL_NUMERIC !== null && row.ACTUAL_NUMERIC !== undefined) {
      input.value = String(row.ACTUAL_NUMERIC);
    } else if (row.ACTUAL_TEXT != null) {
      input.value = String(row.ACTUAL_TEXT);
    }
  });
}

function syncOptionalBlockRequirements() {
  const optionalBlocks = document.querySelectorAll(".process-optional-block");
  optionalBlocks.forEach((block) => {
    const controls = Array.from(
      block.querySelectorAll("input, select, textarea"),
    );
    const hasAnyValue = controls.some((control) => {
      if (control instanceof HTMLSelectElement) {
        return String(control.value || "").trim() !== "";
      }
      return String(control.value || "").trim() !== "";
    });

    controls.forEach((control) => {
      control.required = hasAnyValue;
    });
  });
}

function setupOptionalBlockValidation() {
  const optionalBlocks = document.querySelectorAll(".process-optional-block");
  optionalBlocks.forEach((block) => {
    const controls = block.querySelectorAll("input, select, textarea");
    controls.forEach((control) => {
      control.addEventListener("input", syncOptionalBlockRequirements);
      control.addEventListener("change", syncOptionalBlockRequirements);
    });
  });
  syncOptionalBlockRequirements();
}

async function loadSavedIfRequested(definition) {
  const instanceId = params.get("instance");
  if (!instanceId || !definition) return;

  try {
    const apiUrl = await getApiUrl();
    const response = await fetch(
      `${apiUrl}/special-process-data/${encodeURIComponent(instanceId)}`,
      { credentials: "include" },
    );
    if (!response.ok) return;
    const data = await response.json();
    const header = data.header || {};

    const workOrderInput = document.getElementById("workOrder");
    const partInput = document.getElementById("partNumber");
    const qtyAcceptedInput = document.getElementById("qtyAccepted");
    const qtyRejectedInput = document.getElementById("qtyRejected");
    const notesInput = document.getElementById("notes");

    if (workOrderInput) {
      workOrderInput.value = header.WORK_ORDER_RAW || "";
    }
    if (partInput) {
      partInput.value = header.PART_NUMBER || "";
    }
    if (partDescriptionInput) {
      partDescriptionInput.value = header.PART_DESCRIPTION || "";
    }
    if (qtyAcceptedInput) {
      qtyAcceptedInput.value = header.QTY_ACCEPTED ?? "";
    }
    if (qtyRejectedInput) {
      qtyRejectedInput.value = header.QTY_REJECTED ?? "";
    }
    if (notesInput) {
      notesInput.value = header.NOTES || "";
    }
    if (technicianSelect && header.CREATED_BY) {
      technicianSelect.value = header.CREATED_BY;
      resolvedUserName = technicianSelect.value;
    }
    if (processDateInput) {
      processDateInput.value = header.PROCESS_DATE
        ? String(header.PROCESS_DATE).slice(0, 10)
        : todayIsoDate();
    }
    if (formInstanceInput) {
      formInstanceInput.value = header.FORM_INSTANCE_ID || instanceId;
    }

    hydrateStepValues(data.stepValues || []);
    syncOptionalBlockRequirements();
  } catch (error) {
    console.error("Failed to load special-process record:", error);
  }
}

function todayIsoDate() {
  const now = new Date();
  const pad2 = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

async function populateUserDefaults() {
  // Technician is now chosen from the sidebar dropdown instead of login/computer.
  // const authUser = await getCurrentUser();
  // const sessionUser = await getSessionUser();
  // const currentUser = authUser || sessionUser || "";
  // resolvedUserName = getDefaultTechnicianValue(currentUser);
  // const technicianInput = document.getElementById("field-technician");
  // if (technicianInput) {
  //   technicianInput.value = resolvedUserName;
  // }
  // const userDisplay = document.getElementById("currentUserDisplay");
  // if (userDisplay) {
  //   const name = resolvedUserName;
  //   userDisplay.textContent = name || "Not signed in";
  //   if (!name) userDisplay.style.color = "#9ca3af";
  // }
  if (technicianSelect) {
    if (!technicianSelect.value) technicianSelect.value = "OGOLUBOVIC";
    resolvedUserName = technicianSelect.value;
    technicianSelect.addEventListener("change", () => {
      resolvedUserName = technicianSelect.value;
    });
  }
  if (processDateInput && !processDateInput.value) {
    processDateInput.value = todayIsoDate();
  }
}

if (!form) {
  if (pageTitle) pageTitle.textContent = "Form Not Found";
  if (pageSubtitle)
    pageSubtitle.textContent = "The requested form could not be found.";
  if (formEl) formEl.hidden = true;
} else {
  if (pageTitle) pageTitle.textContent = getFormDisplayName(form);
  if (pageSubtitle)
    pageSubtitle.textContent = `Starter web form for ${form.label} based on the Excel template.`;

  const processTypeInput = document.getElementById("processType");
  if (processTypeInput) {
    processTypeInput.value =
      form.kind === "chem-film" ? "chem-film" : "passivation";
  }

  const processSection = document.querySelector(".section-box");
  if (processSection) {
    processSection.classList.remove(
      "process-theme-citric",
      "process-theme-nitric",
      "process-theme-chemfilm",
      "process-theme-chemfilm-clear",
      "process-theme-chemfilm-gold",
    );
    const themeClass = getProcessTheme(form.definitionId);
    if (themeClass) {
      processSection.classList.add(themeClass);
    }
  }

  if (processFlowEl) {
    const definition = specialProcessFormDefinitions[form.definitionId];
    if (definition) {
      // Group steps: consecutive optional steps form a single block
      const segments = [];
      for (const step of definition.steps) {
        if (step.optional) {
          const last = segments[segments.length - 1];
          if (last?.type === "optional-block") {
            last.steps.push(step);
          } else {
            segments.push({
              type: "optional-block",
              label: step.sectionLabel || "IF NEEDED",
              steps: [step],
            });
          }
        } else {
          segments.push({ type: "step", step });
        }
      }

      function renderStep(step, index) {
        const showInputBoxes = shouldShowStepInput(step);
        const requirementText = getStepRequirement(step);
        const requiredAttr = step.optional ? "" : " required";
        const hasMinuteSecondPair =
          step.ranges.length >= 2 &&
          step.ranges[0]?.label === "Minutes" &&
          step.ranges[1]?.label === "Seconds";

        function renderStandardEntry(range, rangeIndex) {
          const fieldId = `step-${index + 1}-${rangeIndex + 1}`;
          const rangeSummaryMarkup = formatProcessRangeSummary(range);
          const requirementMarkup =
            rangeIndex === 0 && requirementText
              ? `<div class="process-requirement">${requirementText}</div>`
              : "";
          return `
            <div class="process-entry-row">
              <div class="process-entry-main">
                ${rangeSummaryMarkup ? `<div class="process-range-summary">${rangeSummaryMarkup}</div>` : ""}
                ${requirementMarkup}
              </div>
              <div class="process-entry-group">
                <div class="process-entry">
                  <label for="${fieldId}">${step.inputType === "yes-no" ? "Completed" : step.inputType === "pass-fail" ? "Result" : `${range.label}${range.uom ? ` (${range.uom})` : ""}`}</label>
                  ${step.inputType === "yes-no" ? `<select id="${fieldId}" name="${fieldId}"${requiredAttr}><option value=""></option><option value="YES">Yes</option><option value="NO">No</option></select>` : step.inputType === "pass-fail" ? `<select id="${fieldId}" name="${fieldId}"${requiredAttr}><option value=""></option><option value="PASS">Pass</option><option value="FAIL">Fail</option></select>` : `<input id="${fieldId}" name="${fieldId}" type="number"${requiredAttr} />`}
                </div>
              </div>
            </div>
          `;
        }

        function renderMinuteSecondEntry() {
          const minuteFieldId = `step-${index + 1}-1`;
          const secondFieldId = `step-${index + 1}-2`;
          return `
            <div class="process-entry-row">
              <div class="process-entry-main">
                <div class="process-range-summary">Time</div>
                ${requirementText ? `<div class="process-requirement">Allowed: ${requirementText}</div>` : ""}
              </div>
              <div class="process-entry-group process-entry-group-time">
                <div class="process-entry process-entry-time">
                  <label for="${minuteFieldId}">Min</label>
                  <input id="${minuteFieldId}" name="${minuteFieldId}" type="number" min="0"${requiredAttr} />
                </div>
                <div class="process-entry process-entry-time">
                  <label for="${secondFieldId}">Sec</label>
                  <input id="${secondFieldId}" name="${secondFieldId}" type="number" min="0" max="59"${requiredAttr} />
                </div>
              </div>
            </div>
          `;
        }

        // Pure rinse: no inputs and not a pass-fail inspection — render compact
        if (!showInputBoxes && step.inputType !== "pass-fail") {
          return `
            <div class="process-step process-step-rinse">
              <strong>${step.title}</strong>${requirementText ? ` — ${requirementText}` : ""}
            </div>
          `;
        }

        const requirementAndInputMarkup = showInputBoxes
          ? `
            <div class="process-entry-list">
              ${hasMinuteSecondPair ? renderMinuteSecondEntry() : ""}
              ${step.ranges
                .map((range, rangeIndex) => {
                  if (hasMinuteSecondPair && rangeIndex < 2) {
                    return "";
                  }
                  return renderStandardEntry(range, rangeIndex);
                })
                .join("")}
            </div>
          `
          : `
            <div class="process-entry-list">
              <div class="process-entry-row">
                <div class="process-entry-main">
                  ${step.ranges
                    .map((range) => formatProcessRangeSummary(range))
                    .filter(Boolean)
                    .join("<br />")}
                  ${requirementText ? `<div class="process-requirement">${requirementText}</div>` : ""}
                </div>
              </div>
            </div>
          `;
        return `
          <div class="process-step">
            <strong>${step.title}</strong>
            ${requirementAndInputMarkup}
          </div>
        `;
      }

      let stepIndex = 0;
      processFlowEl.innerHTML = segments
        .map((seg) => {
          if (seg.type === "step") {
            return renderStep(seg.step, stepIndex++);
          }
          // optional block
          const inner = seg.steps
            .map((s) => renderStep(s, stepIndex++))
            .join("");
          return `
            <div class="process-optional-block">
              <div class="process-optional-label">${seg.label}</div>
              ${inner}
            </div>
          `;
        })
        .join("");

      setupOptionalBlockValidation();
      loadSavedIfRequested(definition);
    }
  }

  populateUserDefaults();

  if (formEl) {
    formEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      const definition = specialProcessFormDefinitions[form.definitionId];
      const data = new FormData(formEl);
      const values = Object.fromEntries(data.entries());
      const payload = {
        formDefinitionId: form.definitionId,
        formInstanceId: values.formInstanceId || "",
        series: form.series || "",
        sequenceCode: form.sequence || "",
        formLabel: form.label || "",
        workOrderRaw: values.workOrder || "",
        partNumber: values.partNumber || "",
        partDescription: values.partDescription || "",
        qtyAccepted: values.qtyAccepted || 0,
        qtyRejected: values.qtyRejected || 0,
        notes: values.notes || "",
        processType: values.processType || "chem-film",
        createdBy: technicianSelect?.value || resolvedUserName || "",
        technician: technicianSelect?.value || "",
        processDate: processDateInput?.value || "",
        stepValues: collectStepValues(definition),
      };

      try {
        const apiUrl = await getApiUrl();
        const response = await fetch(`${apiUrl}/special-process-data/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to save form");
        }

        const savedInstanceId = result.formInstanceId || "";

        summaryEl.hidden = false;
        summaryEl.innerHTML = `
          <strong>Saved ${getFormDisplayName(form)}</strong><br />
          Work Order: ${values.workOrder || "—"}<br />
          Part Number: ${values.partNumber || "—"}<br />
          Record ID: ${savedInstanceId || "—"}
        `;

        formEl.reset();
        if (technicianSelect) {
          technicianSelect.value = resolvedUserName || "OGOLUBOVIC";
        }
        if (processDateInput) {
          processDateInput.value = todayIsoDate();
        }
        if (processTypeInput) {
          processTypeInput.value =
            form.kind === "chem-film" ? "chem-film" : "passivation";
        }
        if (formInstanceInput) {
          formInstanceInput.value = "";
        }
        if (partDescriptionInput) {
          partDescriptionInput.value = "";
        }
        syncOptionalBlockRequirements();

        const nextParams = new URLSearchParams(window.location.search);
        nextParams.delete("instance");
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`,
        );
      } catch (saveError) {
        console.error("Failed to save special-process form:", saveError);
        summaryEl.hidden = false;
        summaryEl.innerHTML = `<strong>Save failed:</strong> ${saveError.message}`;
      }
    });
  }
}

if (backButton) {
  backButton.addEventListener("click", () => {
    window.location.href = "special-process-forms.html";
  });
}

const woLookupBtn = document.getElementById("woLookupBtn");
if (woLookupBtn) {
  const lookupButtonLabel = woLookupBtn.textContent || "Lookup";
  woLookupBtn.addEventListener("click", async () => {
    const raw = document.getElementById("workOrder")?.value?.trim();
    const partInput = document.getElementById("partNumber");
    if (!raw) {
      partInput && (partInput.placeholder = "Enter a work order first");
      return;
    }
    woLookupBtn.disabled = true;
    woLookupBtn.textContent = "...";
    try {
      const apiUrl = await getApiUrl();
      const res = await fetch(
        `${apiUrl}/special-process-lookup?workOrder=${encodeURIComponent(raw)}`,
      );
      const data = await res.json();
      if (data.error) {
        partInput && (partInput.value = "");
        partInput && (partInput.placeholder = data.error);
        if (partDescriptionInput) partDescriptionInput.value = "";
      } else {
        partInput && (partInput.value = data.part || "");
        if (partDescriptionInput) {
          partDescriptionInput.value = data.description || "";
        }
      }
    } catch (err) {
      console.error("WO lookup failed", err);
    } finally {
      woLookupBtn.disabled = false;
      woLookupBtn.textContent = lookupButtonLabel;
    }
  });
}
