module.exports = function capsNotice(req, res, next) {
  let capsDetected = false;

  // Only check text content fields, not code fields
  const fieldsToCheck = [
    "CORRECTION_TEXT",
    "CAUSE_TEXT",
    "CONTROL_TEXT",
    "DESCRIPTION",
    "DISPOSITION",
    "VERIFICATION",
    "NCM_NOTE",
    "INPUT_TEXT",
    "RESPONSE_TEXT",
    "FOLLOWUP_TEXT",
  ];

  for (const field of fieldsToCheck) {
    const val = req.body[field];
    if (
      typeof val === "string" &&
      val.length > 3 &&
      val === val.toUpperCase()
    ) {
      capsDetected = true;
      break;
    }
  }

  // Attach a flag so your route handler can include a warning
  req.capsWarning = capsDetected;
  next();
};
