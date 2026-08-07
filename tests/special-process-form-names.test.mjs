import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFormId,
  getFormDisplayName,
  getFormFieldGroups,
  getDefaultTechnicianValue,
  formatProcessRangeSummary,
  getStepRequirement,
  shouldShowStepInput,
  getProcessTheme,
  specialProcessFormCatalog,
  specialProcessFormDefinitions,
} from "../public/js/special-process-form-names.mjs";

test("normalizes series and sequence into a stable form id", () => {
  assert.equal(
    normalizeFormId("9440", "1", "citric acid passivation"),
    "9440-01-citric-acid-passivation",
  );
  assert.equal(normalizeFormId("9450", "#7", "chem film"), "9450-07-chem-film");
});

test("uses a consistent display label for all variants", () => {
  const form = specialProcessFormCatalog[0];
  assert.equal(getFormDisplayName(form), "9440-01 • Citric Acid Passivation");
});

test("builds workbook-style field groups for each form type", () => {
  const passivationFields = getFormFieldGroups(specialProcessFormCatalog[0]);
  const chemFilmFields = getFormFieldGroups(specialProcessFormCatalog[2]);

  assert.ok(
    passivationFields.some((field) => field.label === "Tank 1 Time (minutes)"),
  );
  assert.ok(
    passivationFields.some(
      (field) => field.label === "Process Specification(s)",
    ),
  );
  assert.ok(chemFilmFields.some((field) => field.label === "Water Break Free"));
  assert.ok(
    chemFilmFields.some((field) => field.label === "Quantity Rejected"),
  );
});

test("uses a dropdown for passivation specifications", () => {
  const passivationFields = getFormFieldGroups(specialProcessFormCatalog[0]);
  const specField = passivationFields.find(
    (field) => field.key === "processSpecifications",
  );

  assert.equal(specField.type, "select");
  assert.ok(specField.options.includes("AMS 2700E Method 2 Citric Acid"));
});

test("exposes a JSON form definition for 9440-01", () => {
  const formDefinition = specialProcessFormDefinitions["9440-01"];

  assert.ok(formDefinition);
  assert.equal(formDefinition.title, "Citric Acid Passivation");
  assert.equal(formDefinition.steps.length, 6);
  assert.equal(formDefinition.steps[0].title, "Tank 1");
  assert.equal(formDefinition.steps[0].ranges[0].uom, "minutes");
  assert.equal(formDefinition.steps[0].ranges[1].uom, "deg F");
});

test("exposes descriptive text for 9440-03 rinse and break-free steps", () => {
  const formDefinition = specialProcessFormDefinitions["9440-03"];

  assert.ok(formDefinition);
  assert.equal(
    formDefinition.steps.find((step) => step.title === "Tank 2").description,
    "Water Break Free 30 seconds minimum",
  );
  assert.equal(
    formDefinition.steps.find((step) => step.title === "Tank 6").description,
    "Rinse",
  );
  assert.equal(
    formDefinition.steps.find((step) => step.title === "Tank 10").description,
    "Rinse",
  );
});

test("exposes descriptive text for 9440-01 rinse steps", () => {
  const formDefinition = specialProcessFormDefinitions["9440-01"];

  assert.ok(formDefinition);
  assert.equal(
    formDefinition.steps.find((step) => step.title === "Tank 2").description,
    "Water Break Free 30 seconds minimum",
  );
  assert.equal(
    formDefinition.steps.find((step) => step.title === "Tank 6").description,
    "Rinse thoroughly",
  );
  assert.equal(
    formDefinition.steps.find((step) => step.title === "Tank 10").description,
    "Rinse thoroughly",
  );
});

test("formats process ranges without showing numeric values when there is no unit", () => {
  assert.equal(
    formatProcessRangeSummary({
      label: "Rinse thoroughly",
      min: 0,
      max: 0,
      uom: "",
    }),
    "",
  );
  assert.equal(
    formatProcessRangeSummary({
      label: "Time",
      min: 5,
      max: 30,
      uom: "minutes",
    }),
    "Time: 5 - 30 minutes",
  );
});

test("hides input boxes for rinse-only steps such as Tank 6 and Tank 10", () => {
  const formDefinition = specialProcessFormDefinitions["9440-01"];
  const tank6 = formDefinition.steps.find((step) => step.title === "Tank 6");
  const tank10 = formDefinition.steps.find((step) => step.title === "Tank 10");
  const tank1 = formDefinition.steps.find((step) => step.title === "Tank 1");

  assert.equal(shouldShowStepInput(tank6), false);
  assert.equal(shouldShowStepInput(tank10), false);
  assert.equal(shouldShowStepInput(tank1), true);
});

test("prefills technician values from the current user", () => {
  assert.equal(getDefaultTechnicianValue({ name: "Tkent" }), "TKENT");
  assert.equal(getDefaultTechnicianValue({ username: "jdoe" }), "JDOE");
  assert.equal(getDefaultTechnicianValue("system"), "SYSTEM");
});

test("builds Type I chem-film variants from a shared model with only Tank 8 timing deltas", () => {
  const typeIClass1 = specialProcessFormDefinitions["9450-11"];
  const typeIClass3Clear = specialProcessFormDefinitions["9450-13c"];
  const typeIClass3Gold = specialProcessFormDefinitions["9450-17"];

  const tank8Class1 = typeIClass1.steps.find(
    (step) => step.title === "Alodine 1600 (Tank 8)",
  );
  const tank8Class3Clear = typeIClass3Clear.steps.find(
    (step) => step.title === "Alodine 1600 (Tank 8)",
  );
  const tank8Class3Gold = typeIClass3Gold.steps.find(
    (step) => step.title === "Alodine 1600 (Tank 8)",
  );

  assert.equal(tank8Class1.ranges[0].min, 2);
  assert.equal(tank8Class1.ranges[0].max, 5);
  assert.equal(tank8Class1.ranges[0].uom, "minutes");

  assert.equal(tank8Class3Clear.ranges[0].min, 3);
  assert.equal(tank8Class3Clear.ranges[0].max, 10);
  assert.equal(tank8Class3Clear.ranges[0].uom, "seconds");

  assert.equal(tank8Class3Gold.ranges[0].min, 1);
  assert.equal(tank8Class3Gold.ranges[0].max, 3);
  assert.equal(tank8Class3Gold.ranges[0].uom, "minutes");
});

test("builds Type II chem-film variants with required flow and Tank 11 timing deltas", () => {
  const typeIIClass1 = specialProcessFormDefinitions["9450-21"];
  const typeIIClass3 = specialProcessFormDefinitions["9450-23"];

  assert.equal(
    typeIIClass1.steps.some((step) => step.optional),
    false,
  );
  assert.equal(
    typeIIClass3.steps.some((step) => step.optional),
    false,
  );

  const tank11Class1 = typeIIClass1.steps.find(
    (step) => step.title === "Chemeon TCP-HF® (Tank 11)",
  );
  const tank11Class3 = typeIIClass3.steps.find(
    (step) => step.title === "Chemeon TCP-HF® (Tank 11)",
  );

  assert.equal(tank11Class1.ranges[0].min, 3);
  assert.equal(tank11Class1.ranges[0].max, 7);
  assert.equal(tank11Class3.ranges[0].min, 1);
  assert.equal(tank11Class3.ranges[0].max, 4);
});

test("maps form definitions to the expected process theme", () => {
  assert.equal(getProcessTheme("9450-11"), "process-theme-chemfilm");
  assert.equal(getProcessTheme("9450-13c"), "process-theme-chemfilm-clear");
  assert.equal(getProcessTheme("9450-17"), "process-theme-chemfilm-gold");
  assert.equal(getProcessTheme("9450-21"), "process-theme-chemfilm-clear");
  assert.equal(getProcessTheme("9450-23"), "process-theme-chemfilm-clear");
});
