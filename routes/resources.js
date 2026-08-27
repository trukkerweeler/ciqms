const express = require("express");
const resourceModel = require("../models/resource");

const router = express.Router();
const RESOURCE_TYPES = new Set([
  "EQUIPMENT",
  "FACILITY",
  "CONDITION",
  "PERSON",
  "MATERIAL",
]);

function validateResource(data) {
  if (!data.NAME || !data.NAME.trim()) return "NAME is required";
  if (!RESOURCE_TYPES.has(data.TYPE)) {
    return "TYPE must be EQUIPMENT, FACILITY, CONDITION, PERSON, or MATERIAL";
  }
  return null;
}

router.get("/subject/:subjectId", async (req, res) => {
  try {
    if (!req.params.subjectId.trim()) {
      return res.status(400).json({ error: "SUBJECT_ID is required" });
    }
    res.json(await resourceModel.listBySubject(req.params.subjectId.trim()));
  } catch (error) {
    console.error("Failed to list subject resources:", error);
    res.status(500).json({ error: "Failed to list subject resources" });
  }
});

router.post("/", async (req, res) => {
  const data = {
    NAME: String(req.body.NAME || "").trim(),
    TYPE: String(req.body.TYPE || "")
      .trim()
      .toUpperCase(),
    NOTES: req.body.NOTES,
  };
  const validationError = validateResource(data);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    res.status(201).json(await resourceModel.createResource(data));
  } catch (error) {
    console.error("Failed to create resource:", error);
    res.status(500).json({ error: "Failed to create resource" });
  }
});

router.put("/:id", async (req, res) => {
  const data = {
    NAME: String(req.body.NAME || "").trim(),
    TYPE: String(req.body.TYPE || "")
      .trim()
      .toUpperCase(),
    NOTES: req.body.NOTES,
  };
  const validationError = validateResource(data);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const updated = await resourceModel.updateResource(req.params.id, data);
    if (!updated) return res.status(404).json({ error: "Resource not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update resource:", error);
    res.status(500).json({ error: "Failed to update resource" });
  }
});

router.post("/requirements", async (req, res) => {
  const data = {
    SUBJECT_ID: String(req.body.SUBJECT_ID || "").trim(),
    RESOURCE_ID: req.body.RESOURCE_ID,
    REQUIRED_QUANTITY: req.body.REQUIRED_QUANTITY || null,
  };
  if (!data.SUBJECT_ID || !data.RESOURCE_ID) {
    return res
      .status(400)
      .json({ error: "SUBJECT_ID and RESOURCE_ID are required" });
  }

  try {
    await resourceModel.assignRequirement(data);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Failed to assign subject resource:", error);
    res.status(500).json({ error: "Failed to assign subject resource" });
  }
});

router.delete("/requirements/:subjectId/:resourceId", async (req, res) => {
  try {
    const removed = await resourceModel.removeRequirement(
      req.params.subjectId,
      req.params.resourceId,
    );
    if (!removed)
      return res.status(404).json({ error: "Requirement not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to remove subject resource:", error);
    res.status(500).json({ error: "Failed to remove subject resource" });
  }
});

module.exports = router;
