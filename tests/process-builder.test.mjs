import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultProcessState,
  createEmptyField,
  createEmptyStep,
} from "../public/js/process-builder-model.mjs";

test("creates a default process state with one step and one field", () => {
  const state = createDefaultProcessState();

  assert.equal(state.processId, "");
  assert.equal(state.steps.length, 1);
  assert.equal(state.steps[0].fields.length, 1);
  assert.equal(state.steps[0].fields[0].type, "number");
});

test("creates an empty field with required by default", () => {
  const field = createEmptyField();

  assert.equal(field.required, true);
  assert.equal(field.type, "number");
  assert.equal(field.unit, "");
});

test("creates an empty step with one empty field", () => {
  const step = createEmptyStep();

  assert.equal(step.title, "");
  assert.equal(step.fields.length, 1);
});
