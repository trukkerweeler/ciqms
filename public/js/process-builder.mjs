import {
  createDefaultProcessState,
  createEmptyField,
  createEmptyStep,
} from "./process-builder-model.mjs";

const state = createDefaultProcessState();

const headerForm = document.getElementById("headerForm");
const stepsContainer = document.getElementById("stepsContainer");
const previewEl = document.getElementById("preview");
const addStepButton = document.getElementById("addStepButton");
const copyJsonButton = document.getElementById("copyJsonButton");

function render() {
  headerForm.innerHTML = `
    <div class="grid">
      <label class="field">
        <span>Process ID</span>
        <input name="processId" value="${state.processId}" />
      </label>
      <label class="field">
        <span>Name</span>
        <input name="name" value="${state.name}" />
      </label>
      <label class="field">
        <span>Area</span>
        <input name="areaNumber" value="${state.areaNumber}" />
      </label>
      <label class="field">
        <span>Activity</span>
        <input name="activityNo" value="${state.activityNo}" />
      </label>
      <label class="field">
        <span>Element</span>
        <input name="elementNo" value="${state.elementNo}" />
      </label>
      <label class="field">
        <span>Process Level</span>
        <input name="processLevel" value="${state.processLevel}" />
      </label>
      <label class="field">
        <span>Employee ID</span>
        <input name="employeeId" value="${state.employeeId}" />
      </label>
      <label class="field">
        <span>Job Code</span>
        <input name="jobCode" value="${state.jobCode}" />
      </label>
      <label class="field">
        <span>Function Code</span>
        <input name="functionCode" value="${state.functionCode}" />
      </label>
      <label class="field">
        <span>Create By</span>
        <input name="createBy" value="${state.createBy}" />
      </label>
      <label class="field">
        <span>Create Date</span>
        <input type="date" name="createDate" value="${state.createDate}" />
      </label>
    </div>
  `;

  stepsContainer.innerHTML = state.steps
    .map((step, stepIndex) => {
      const fieldsMarkup = step.fields
        .map((field, fieldIndex) => {
          return `
            <div class="field-row">
              <label class="field compact">
                <span>Field Name</span>
                <input data-step-index="${stepIndex}" data-field-index="${fieldIndex}" name="fieldName" value="${field.name}" />
              </label>
              <label class="field compact">
                <span>Label</span>
                <input data-step-index="${stepIndex}" data-field-index="${fieldIndex}" name="fieldLabel" value="${field.label}" />
              </label>
              <label class="field compact">
                <span>Type</span>
                <select data-step-index="${stepIndex}" data-field-index="${fieldIndex}" name="fieldType">
                  <option value="number" ${field.type === "number" ? "selected" : ""}>Number</option>
                  <option value="text" ${field.type === "text" ? "selected" : ""}>Text</option>
                  <option value="select" ${field.type === "select" ? "selected" : ""}>Select</option>
                  <option value="date" ${field.type === "date" ? "selected" : ""}>Date</option>
                </select>
              </label>
              <label class="field compact">
                <span>Unit</span>
                <input data-step-index="${stepIndex}" data-field-index="${fieldIndex}" name="fieldUnit" value="${field.unit}" />
              </label>
              <label class="field compact checkbox">
                <span>Required</span>
                <input data-step-index="${stepIndex}" data-field-index="${fieldIndex}" name="fieldRequired" type="checkbox" ${field.required ? "checked" : ""} />
              </label>
              <button class="btn secondary small" type="button" data-action="remove-field" data-step-index="${stepIndex}" data-field-index="${fieldIndex}">Remove</button>
            </div>
          `;
        })
        .join("");

      return `
        <article class="step-card">
          <div class="step-head">
            <label class="field">
              <span>Step Title</span>
              <input data-step-index="${stepIndex}" name="stepTitle" value="${step.title}" />
            </label>
            <label class="field">
              <span>Step Description</span>
              <input data-step-index="${stepIndex}" name="stepDescription" value="${step.description}" />
            </label>
            <button class="btn secondary small" type="button" data-action="remove-step" data-step-index="${stepIndex}">Remove Step</button>
          </div>
          <div class="field-list">${fieldsMarkup}</div>
          <button class="btn small" type="button" data-action="add-field" data-step-index="${stepIndex}">Add Field</button>
        </article>
      `;
    })
    .join("");

  previewEl.textContent = JSON.stringify(state, null, 2);
}

function updateHeaderField(event) {
  const { name, value, type, checked } = event.target;
  if (name in state) {
    state[name] = type === "checkbox" ? checked : value;
  }
}

function updateStepField(event) {
  const stepIndex = Number(event.target.dataset.stepIndex);
  const fieldIndex = Number(event.target.dataset.fieldIndex);
  const step = state.steps[stepIndex];
  if (!step) return;

  if (event.target.name === "stepTitle") {
    step.title = event.target.value;
  } else if (event.target.name === "stepDescription") {
    step.description = event.target.value;
  } else if (event.target.name === "fieldName") {
    step.fields[fieldIndex].name = event.target.value;
  } else if (event.target.name === "fieldLabel") {
    step.fields[fieldIndex].label = event.target.value;
  } else if (event.target.name === "fieldType") {
    step.fields[fieldIndex].type = event.target.value;
  } else if (event.target.name === "fieldUnit") {
    step.fields[fieldIndex].unit = event.target.value;
  } else if (event.target.name === "fieldRequired") {
    step.fields[fieldIndex].required = event.target.checked;
  }

  render();
}

function handleStepsClick(event) {
  const action = event.target.dataset.action;
  if (!action) return;

  const stepIndex = Number(event.target.dataset.stepIndex);
  const fieldIndex = Number(event.target.dataset.fieldIndex);

  if (action === "add-field") {
    state.steps[stepIndex]?.fields.push(createEmptyField());
    render();
  } else if (action === "remove-field") {
    state.steps[stepIndex]?.fields.splice(fieldIndex, 1);
    if (state.steps[stepIndex]?.fields.length === 0) {
      state.steps[stepIndex].fields.push(createEmptyField());
    }
    render();
  } else if (action === "remove-step") {
    state.steps.splice(stepIndex, 1);
    if (state.steps.length === 0) {
      state.steps.push(createEmptyStep());
    }
    render();
  }
}

headerForm.addEventListener("input", (event) => {
  updateHeaderField(event);
  render();
});

stepsContainer.addEventListener("input", (event) => {
  updateStepField(event);
});

stepsContainer.addEventListener("click", handleStepsClick);

addStepButton.addEventListener("click", () => {
  state.steps.push(createEmptyStep());
  render();
});

copyJsonButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    copyJsonButton.textContent = "Copied";
    setTimeout(() => {
      copyJsonButton.textContent = "Copy JSON";
    }, 1200);
  } catch (error) {
    copyJsonButton.textContent = "Copy failed";
  }
});

render();
