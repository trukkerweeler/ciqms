// User email mapping for backend routes
// Mirrors the frontend users.mjs mapping
const userEmails = {
  DEFAULT: "tim.kent@ci-aviation.com",
  TKENT: "tim.kent@ci-aviation.com",
  BOBBI: "bobbi.bush@ci-aviation.com",
  CHARRISON: "craig@ci-aviation.com",
  RMATSAMAS: "tim.kent@ci-aviation.com",
  VRASMUSSEN: "victoria.r@ci-aviation.com",
  AMIDDLETON: "alex.m@ci-aviation.com",
  QC: "tim.kent@ci-aviation.com, bobbi.bush@ci-aviation.com, craig@ci-aviation.com",
};

/**
 * Get email address for a username
 * @param {string} username - The username (e.g., TKENT, BOBBI)
 * @returns {string} Email address or DEFAULT email if not found
 */
function getUserEmail(username) {
  if (!username) {
    return userEmails.DEFAULT;
  }
  return userEmails[username.toUpperCase()] || userEmails.DEFAULT;
}

module.exports = {
  userEmails,
  getUserEmail,
};
