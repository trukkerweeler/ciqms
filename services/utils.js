// services/utils.js - Utility functions for PROCESSCERT2

/**
 * Clean serial number by removing null bytes and trimming
 */
function cleanSerialNumber(sn) {
  if (!sn) return "";
  return String(sn).replace(/\0/g, "").trim();
}

/**
 * Check if serial number matches job reference pattern (XXXXXX-XXX)
 */
function isJobReference(sn) {
  if (!sn || typeof sn !== "string") return false;
  const trimmed = cleanSerialNumber(sn);
  return /^(\d{6})-(\d{3})$/.test(trimmed);
}

/**
 * Parse job reference from serial number
 * Returns { job, suffix } or null
 */
function parseJobReference(sn) {
  const trimmed = cleanSerialNumber(sn);
  const match = trimmed.match(/^(\d{6})-(\d{3})$/);
  return match ? { job: match[1], suffix: match[2] } : null;
}

/**
 * Combine date and time into datetime string (YYYY-MM-DD HH:MM:SS format)
 */
function toDateTime(date, time) {
  if (!date) return null;
  const timeStr = time ? String(time).substring(0, 8) : "00:00:00";
  return `${date} ${timeStr}`;
}

/**
 * Compare two datetime strings lexicographically
 * Returns: < 0 if a < b, 0 if a == b, > 0 if a > b
 */
function compareDateTimes(a, b) {
  if (!a || !b) return 0;
  return a.localeCompare(b);
}

module.exports = {
  cleanSerialNumber,
  isJobReference,
  parseJobReference,
  toDateTime,
  compareDateTimes,
};
